// ====================================================================
//  Pertinence des offres (« % compatible ») — calcul réel.
//
//  Jusqu'au 30/09/2026, le score affiché dérivait uniquement du RANG de
//  l'offre dans la réponse de l'API (96 %, 95 %, 94 %…) : une offre hors
//  sujet pouvait afficher 87 %. Ici, on mesure ce qui compte vraiment :
//    1. l'intitulé de l'offre contient-il le métier visé ? (poids principal)
//    2. le métier est-il au moins cité dans la description ?
//    3. les compétences du profil apparaissent-elles dans l'offre ?
//    4. le type de contrat correspond-il aux souhaits du candidat ?
//  Tout est fait sans IA (rapide, gratuit, explicable).
// ====================================================================

export interface ScoringProfile {
  targetTitle: string;
  skills?: string[];
  contractTypes?: string[];
}

export interface ScorableOffer {
  title: string;
  company?: string;
  type?: string;
  tags?: string[];
  aiInsight?: string;
}

const STOPWORDS = new Set([
  'de', 'des', 'du', 'la', 'le', 'les', 'l', 'd', 'un', 'une', 'et', 'en', 'a', 'au', 'aux', 'pour',
  'par', 'sur', 'avec', 'sans', 'dans', 'h', 'f', 'hf', 'fh', 'x', 'm', 'e', 'es', 'ou', 'the', 'and', 'of',
  'cdi', 'cdd', 'interim', 'alternance', 'stage', 'temps', 'plein', 'partiel', 'poste', 'offre', 'emploi',
]);

/** Minuscules, sans accents, sans marqueurs d'écriture inclusive ni mentions (H/F). */
export const normalizeText = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\((?:h|f|e|es|x)\s*[\/-]?\s*(?:h|f|e|es|x)?\)/g, ' ') // (H/F), (e), (F/H)…
    .replace(/\b(?:h\s*\/\s*f|f\s*\/\s*h)\b/g, ' ')
    .replace(/[·•.](?:e|es|euse|rice|ice|ve)\b/g, '') // assistant·e, vendeur.euse
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Racine grossière : rapproche masculin/féminin et singulier/pluriel. */
export const stem = (w: string): string => {
  let t = w;
  const rules: [RegExp, string][] = [
    [/trices?$/, 'teur'], [/euses?$/, 'eur'], [/ives?$/, 'if'], [/iennes?$/, 'ien'],
    [/ieres?$/, 'ier'], [/eres?$/, 'er'], [/ennes?$/, 'en'], [/ettes?$/, 'et'],
  ];
  for (const [re, rep] of rules) {
    if (re.test(t)) { t = t.replace(re, rep); break; }
  }
  t = t.replace(/(?:es|s|x)$/, '').replace(/e$/, '');
  return t.length > 6 ? t.slice(0, 6) : t;
};

export const keywords = (s: string): string[] =>
  Array.from(new Set(normalizeText(s).split(' ').filter((w) => w.length > 1 && !STOPWORDS.has(w)).map(stem)));

const share = (needles: string[], haystack: Set<string>): number =>
  needles.length ? needles.filter((n) => haystack.has(n)).length / needles.length : 0;

export interface OfferRelevance {
  score: number;       // 0-100, affiché comme « % compatible »
  titleMatch: number;  // 0-1 : part des mots du métier présents dans l'intitulé
  relevant: boolean;   // faux = hors sujet (le métier n'apparaît ni dans l'intitulé ni dans le texte)
}

export const scoreOffer = (offer: ScorableOffer, profile: ScoringProfile): OfferRelevance => {
  const target = keywords(profile.targetTitle);
  const titleWords = new Set(keywords(offer.title));
  const bodyWords = new Set(keywords(`${offer.title} ${(offer.tags || []).join(' ')} ${offer.aiInsight || ''}`));

  const titleMatch = share(target, titleWords);
  const bodyMatch = share(target, bodyWords);

  const skills = (profile.skills || []).filter(Boolean).slice(0, 12);
  const skillHits = skills.filter((sk) => {
    const k = keywords(sk);
    return k.length > 0 && k.every((w) => bodyWords.has(w));
  }).length;
  const skillScore = skills.length ? Math.min(1, skillHits / Math.min(4, skills.length)) : 0.5;

  const wanted = (profile.contractTypes || []).map((c) => normalizeText(c));
  const offerType = normalizeText(offer.type || '');
  const contractScore = wanted.length === 0 ? 0.5 : wanted.some((w) => w && offerType.includes(w)) ? 1 : 0;

  // Pondération : l'intitulé domine, le texte rattrape les intitulés « créatifs ».
  const raw = 0.55 * titleMatch + 0.15 * bodyMatch + 0.2 * skillScore + 0.1 * contractScore;
  const score = Math.round(Math.max(20, Math.min(98, 30 + raw * 70)));

  return { score, titleMatch, relevant: titleMatch > 0 || bodyMatch >= 0.5 };
};

/** Clé de doublon : même poste, même entreprise, quelle que soit la source ou la graphie. */
export const dedupeKey = (title: string, company: string): string => {
  const co = normalizeText(company)
    .replace(/\b(sas|sasu|sarl|sa|eurl|sci|groupe|group|france|inc|ltd)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${keywords(title).sort().join(' ')}|${co}`;
};
