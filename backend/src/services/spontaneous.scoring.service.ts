import dns from 'dns/promises';

// ====================================================================
//  Scoring des candidatures spontanées — décide du niveau d'automatisation
//  AUTO_SAFE   : JobBoost peut envoyer sans validation
//  AUTO_REVIEW : envoi après validation explicite de l'utilisateur
//  NO_SEND     : envoi automatique interdit (action manuelle uniquement)
//
//  Le score (0-100) est indicatif ; les conditions BLOQUANTES priment toujours
//  et forcent NO_SEND quel que soit le score.
// ====================================================================

export type AutoLevel = 'AUTO_SAFE' | 'AUTO_REVIEW' | 'NO_SEND';
export type ContactSource = 'ft_contact' | 'estimated' | 'manual' | 'hunter' | 'none';

// Quotas mensuels d'envoi AUTOMATIQUE (MVP volontairement conservateur)
export const AUTO_SEND_QUOTA = {
  safeCap: 5,   // au-delà → bascule en AUTO_REVIEW
  hardCap: 10,  // au-delà → NO_SEND
};

// Adresses génériques tolérées pour un envoi (mais jamais en AUTO_SAFE seules)
const ACCEPTED_GENERIC = ['contact', 'recrutement', 'recrutements', 'rh', 'job', 'jobs', 'emploi', 'candidature', 'hello'];
// Adresses qui interdisent tout envoi
const BLOCKED_LOCALPARTS = ['noreply', 'no-reply', 'donotreply', 'do-not-reply', 'mailer-daemon', 'postmaster'];

export interface ScoringContext {
  // Données entreprise (issues de France Travail ou démo)
  companyName: string;
  domain?: string;
  contactEmail?: string;       // si déjà fourni (ft_contact / manuel)
  contactSource?: ContactSource;
  hiringPotential?: string;    // "Très Élevé" | "Élevé" | "Modéré" | "Moyen"
  sector?: string;
  ftSource?: string;           // "francetravail" | "demo"

  // Profil utilisateur (cohérence)
  userTitle?: string | null;
  userTargetSectors?: string[];
  userCity?: string | null;
  companyLocation?: string;

  // Pré-requis envoi
  includeLetter?: boolean;
  hasCV?: boolean;

  // Historique / garde-fous (fournis par le controller à partir de la DB)
  isBlacklisted?: boolean;
  alreadyAppliedRecently?: boolean;     // candidature à cette entreprise < 6 mois
  domainBouncedRecently?: boolean;      // bounce sur ce domaine < 90 jours
  autoSentThisMonth?: number;           // compteur d'envois auto du mois
  isFollowUp?: boolean;                 // s'agit-il d'une relance ?
}

export interface ScoringResult {
  autoScore: number;            // 0-100
  autoLevel: AutoLevel;
  autoBlockReason: string | null;
  contactEmail: string | null;
  contactSource: ContactSource;
  emailDeliverable: boolean;    // domaine résolvable (MX) ?
  matchScore: number;           // cohérence profil 0-100 (sous-score, exposé pour l'UI)
}

// Estime une adresse générique professionnelle à partir d'un domaine.
const estimateEmail = (domain?: string): string | null => {
  if (!domain) return null;
  const clean = domain.trim().toLowerCase().replace(/^www\./, '');
  // domaine minimalement valide : "x.y"
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) return null;
  return `contact@${clean}`;
};

// Vérifie qu'un domaine possède des enregistrements MX (email potentiellement délivrable).
export const hasMxRecord = async (domain?: string | null): Promise<boolean> => {
  if (!domain) return false;
  try {
    const records = await dns.resolveMx(domain.replace(/^www\./, ''));
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
};

// Cohérence métier / secteur / localisation entre l'utilisateur et l'entreprise (0-100).
const computeMatchScore = (ctx: ScoringContext): number => {
  let score = 50; // base neutre

  // Potentiel d'embauche (signal fort de France Travail)
  switch ((ctx.hiringPotential || '').toLowerCase()) {
    case 'très élevé': score += 25; break;
    case 'élevé': score += 15; break;
    case 'modéré':
    case 'moyen': score += 5; break;
  }

  // Cohérence secteur
  if (ctx.userTargetSectors?.length && ctx.sector) {
    const sec = ctx.sector.toLowerCase();
    if (ctx.userTargetSectors.some((s) => sec.includes(s.toLowerCase()) || s.toLowerCase().includes(sec))) {
      score += 15;
    }
  }

  // Cohérence localisation
  if (ctx.userCity && ctx.companyLocation) {
    if (ctx.companyLocation.toLowerCase().includes(ctx.userCity.toLowerCase())) score += 10;
  }

  return Math.max(0, Math.min(100, score));
};

const localPart = (email: string): string => email.split('@')[0]?.toLowerCase() || '';

/**
 * Calcule le niveau d'automatisation d'une candidature spontanée.
 * Effectue une vérification DNS (MX) sur le domaine de l'email cible.
 * `mxResolver` est injectable (tests déterministes sans réseau).
 */
export const scoreSpontaneous = async (
  ctx: ScoringContext,
  mxResolver: (domain?: string | null) => Promise<boolean> = hasMxRecord,
): Promise<ScoringResult> => {
  const matchScore = computeMatchScore(ctx);

  // 1. Détermination de l'email cible et de sa source
  let contactEmail: string | null = ctx.contactEmail?.trim() || null;
  let contactSource: ContactSource = ctx.contactSource || (contactEmail ? 'manual' : 'none');
  if (!contactEmail) {
    contactEmail = estimateEmail(ctx.domain);
    contactSource = contactEmail ? 'estimated' : 'none';
  }

  const emailDeliverable = contactEmail
    ? await mxResolver(contactEmail.split('@')[1])
    : false;

  // 2. Conditions BLOQUANTES → NO_SEND (l'une suffit)
  const block = (reason: string): ScoringResult => ({
    autoScore: 0,
    autoLevel: 'NO_SEND',
    autoBlockReason: reason,
    contactEmail,
    contactSource,
    emailDeliverable,
    matchScore,
  });

  if (ctx.ftSource === 'demo') return block("Entreprise de démonstration — pas d'envoi réel possible.");
  if (ctx.isBlacklisted) return block('Entreprise exclue par vos préférences.');
  if (!contactEmail) return block("Aucune adresse e-mail identifiée pour cette entreprise.");
  if (BLOCKED_LOCALPARTS.some((p) => localPart(contactEmail!).includes(p)))
    return block("Adresse e-mail de type « ne pas répondre » — envoi impossible.");
  if (!emailDeliverable) return block("Le domaine e-mail ne semble pas valide (aucun serveur de réception).");
  if (ctx.domainBouncedRecently) return block('Un e-mail a récemment été rejeté par ce domaine (90 j).');
  if (ctx.alreadyAppliedRecently) return block('Vous avez déjà candidaté ici récemment (6 mois).');
  if (matchScore < 50) return block('Profil trop éloigné de cette entreprise.');
  if ((ctx.autoSentThisMonth ?? 0) >= AUTO_SEND_QUOTA.hardCap)
    return block(`Quota d'envois automatiques du mois atteint (${AUTO_SEND_QUOTA.hardCap}).`);

  // 3. Score d'automatisation (0-100)
  let score = matchScore; // socle = cohérence profil

  // Qualité de l'adresse
  const lp = localPart(contactEmail);
  if (contactSource === 'ft_contact' || contactSource === 'hunter') score += 15;
  else if (contactSource === 'manual') score += 10;
  if (ACCEPTED_GENERIC.includes(lp)) score += 5; // générique pro accepté mais sans bonus nominatif

  // Confiance entreprise
  if ((ctx.hiringPotential || '').toLowerCase() === 'très élevé') score += 10;

  // Pièces jointes / lettre
  if (ctx.hasCV) score += 8;
  if (ctx.includeLetter) score += 5;

  score = Math.max(0, Math.min(100, score));

  // 4. Conditions forçant AUTO_REVIEW (même si score élevé)
  const forceReview =
    ctx.isFollowUp ||
    (ctx.autoSentThisMonth ?? 0) >= AUTO_SEND_QUOTA.safeCap ||
    contactSource === 'estimated' ||           // email deviné → toujours valider
    ACCEPTED_GENERIC.includes(lp) ||            // générique → valider
    (ctx.hiringPotential || '').toLowerCase() !== 'très élevé' ||
    !ctx.hasCV ||                               // pas de CV prêt → valider
    matchScore < 75;

  let autoLevel: AutoLevel;
  if (score >= 80 && !forceReview) autoLevel = 'AUTO_SAFE';
  else autoLevel = 'AUTO_REVIEW';

  return {
    autoScore: score,
    autoLevel,
    autoBlockReason: null,
    contactEmail,
    contactSource,
    emailDeliverable,
    matchScore,
  };
};

// Libellés FR pour l'UI
export const AUTO_LEVEL_LABEL: Record<AutoLevel, string> = {
  AUTO_SAFE: 'Envoi automatique',
  AUTO_REVIEW: 'À valider',
  NO_SEND: 'Manuel',
};
