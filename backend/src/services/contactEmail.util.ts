// ====================================================================
//  Extraction d'un email de contact EMPLOYEUR depuis une offre.
//
//  But : augmenter le nombre d'offres « postables depuis Joboost ».
//  France Travail ne remplit que rarement le champ structuré
//  `contact.courriel`, mais beaucoup d'employeurs écrivent leur adresse
//  en clair dans le texte de l'offre (« Envoyez votre CV à rh@societe.fr »).
//  On la récupère de façon défensive, en écartant tout ce qui n'est pas
//  une adresse d'employeur exploitable pour une candidature.
// ====================================================================

// Regex email tolérante mais bornée (évite d'avaler la ponctuation autour).
const EMAIL_RE = /[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}/gi;

// Domaines à IGNORER : ce ne sont pas des boîtes d'employeur où adresser une candidature.
const BLOCKED_DOMAINS = [
  'francetravail.fr', 'pole-emploi.fr', 'pole-emploi.intra', // conseillers FT, pas l'employeur
  'candidat.joboost.local', 'joboost.local',                 // emails synthétiques internes
  'example.com', 'example.org', 'domain.com', 'email.com',    // exemples/placeholders
  'sentry.io', 'wixpress.com',                               // outils techniques parasites
];

// Locales génériques sans réponse possible.
const BLOCKED_LOCALPARTS = ['noreply', 'no-reply', 'nepasrepondre', 'ne-pas-repondre', 'donotreply', 'mailer-daemon'];

// Extensions de fichiers = faux positifs (ex. "logo@2x.png", "sprite@3x.webp").
const FILE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico|pdf|docx?|xlsx?|zip)$/i;

const isUsable = (email: string): boolean => {
  const lower = email.toLowerCase();
  const at = lower.indexOf('@');
  if (at <= 0) return false;
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (!domain.includes('.')) return false;
  if (FILE_EXT_RE.test(domain)) return false;
  if (BLOCKED_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) return false;
  if (BLOCKED_LOCALPARTS.some((p) => local.startsWith(p))) return false;
  return true;
};

/**
 * Renvoie le premier email d'employeur exploitable trouvé parmi les sources,
 * dans l'ordre de priorité fourni (champ structuré d'abord, texte libre ensuite).
 * Renvoie `undefined` si rien d'exploitable.
 */
export const extractContactEmail = (...sources: Array<string | null | undefined>): string | undefined => {
  for (const src of sources) {
    if (!src) continue;
    const matches = src.match(EMAIL_RE);
    if (!matches) continue;
    for (const raw of matches) {
      const email = raw.trim();
      if (isUsable(email)) return email;
    }
  }
  return undefined;
};
