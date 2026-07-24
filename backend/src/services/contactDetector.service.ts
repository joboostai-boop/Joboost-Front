// ====================================================================
//  Détecteur de contact employeur (candidature spontanée "emploi général").
//
//  Objectif : trouver un email d'entreprise EXPLOITABLE et vérifié, à partir
//  d'un nom d'entreprise (+ ville) ou d'un domaine déjà connu, pour permettre
//  l'envoi de la candidature via le relais DKIM contact@joboost.app — sans
//  dépendre d'un service tiers.
//
//  - Chemin FIABLE : on connaît déjà le domaine (site de l'offre / La Bonne
//    Boîte) → on scrape ses pages contact / mentions légales / recrutement.
//  - Chemin de SECOURS : recherche web (DuckDuckGo) pour retrouver le domaine
//    (moins fiable depuis un serveur : DuckDuckGo peut limiter les datacenters).
//
//  Garde-fous : filtre les placeholders de formulaire (votre@email.com…),
//  confirme que le site correspond bien à l'entreprise (nom/ville), n'accepte
//  que les emails du domaine du site, vérifie le MX. Best-effort : ne lève
//  jamais d'exception vers l'appelant, et met les résultats en cache 24 h.
// ====================================================================
import dns from 'dns/promises';
import { extractContactEmail } from './contactEmail.util';

export interface DetectInput {
  companyName: string;
  city?: string;
  knownDomain?: string; // domaine déjà connu (offre / LBB) → chemin fiable
}

export interface DetectResult {
  email: string;
  domain: string;
  mxVerified: boolean;
  confidence: 'high' | 'medium' | 'low';
  source: 'known-domain' | 'web-search';
}

// ----- Filtrage des placeholders (exemples de champs de formulaire) -----
const PLACEHOLDER_LOCAL_RE =
  /^(votre|vos|vous|ton|nom|prenom|prenoms|exemple|example|test|sample|email|mail|user|utilisateur|name|yourname|xxx+)([._-]?(email|nom|adresse|mail))?$/i;
const PLACEHOLDER_DOMAINS = new Set([
  'example.com', 'example.org', 'exemple.fr', 'domain.com', 'domaine.fr',
  'email.com', 'email.fr', 'mail.com', 'monsite.fr', 'votresite.fr', 'yoursite.com', 'test.com', 'site.com',
]);

export const isPlaceholderEmail = (email: string): boolean => {
  const at = email.toLowerCase().indexOf('@');
  if (at <= 0) return true;
  const local = email.slice(0, at).toLowerCase();
  const domain = email.slice(at + 1).toLowerCase();
  if (PLACEHOLDER_DOMAINS.has(domain)) return true;
  if (PLACEHOLDER_LOCAL_RE.test(local)) return true;
  return false;
};

// ----- Correspondance site ↔ entreprise (écarte franchises / agrégateurs) -----
const STOP = new Set([
  'boulangerie', 'patisserie', 'garage', 'restaurant', 'plomberie', 'coiffure', 'menuiserie',
  'electricite', 'automobile', 'sarl', 'sas', 'sasu', 'eurl', 'societe', 'entreprise',
  'group', 'groupe', 'france', 'saint', 'les', 'des', 'the', 'and', 'company',
]);
const normalize = (s: string): string =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');
const nameTokens = (name: string): string[] =>
  normalize(name).split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));

export const siteMatchesCompany = (pageText: string, companyName: string, city?: string): boolean => {
  const text = normalize(pageText);
  if (nameTokens(companyName).some((t) => text.includes(t))) return true;
  const c = normalize(city || '');
  return c.length > 2 && text.includes(c);
};

// ----- Réseau (best-effort, timeouts courts) -----
const fetchPage = async (url: string, ms = 7000): Promise<string | null> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JoboostBot/1.0)', 'Accept-Language': 'fr-FR' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!/text\/(html|plain)/.test(ct)) return null;
    return (await res.text()).slice(0, 400_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const mxOk = async (email: string): Promise<boolean> => {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
};

const CONTACT_PATHS = ['', '/contact', '/nous-contacter', '/mentions-legales', '/recrutement', '/carrieres'];
const cleanDomain = (d: string): string =>
  d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim().toLowerCase();

const scrapeDomain = async (domain: string, companyName: string, city: string | undefined, deadline: number): Promise<DetectResult | null> => {
  let matched = false;
  let candidate: string | null = null;
  outer: for (const base of [`https://${domain}`, `https://www.${domain}`]) {
    for (const p of CONTACT_PATHS) {
      if (Date.now() > deadline) break outer; // budget de temps dépassé
      const html = await fetchPage(base + p);
      if (!html) continue;
      if (!matched && siteMatchesCompany(html, companyName, city)) matched = true;
      if (!candidate) {
        const decoded = html.replace(/%40/gi, '@').replace(/&#64;/g, '@');
        const email = extractContactEmail(decoded);
        // On n'accepte que les emails DU domaine du site, non-placeholder.
        if (email && !isPlaceholderEmail(email) && email.split('@')[1] === domain) candidate = email;
      }
      if (matched && candidate) break outer;
    }
  }
  if (!candidate) return null;
  const mxVerified = await mxOk(candidate);
  return {
    email: candidate,
    domain,
    mxVerified,
    confidence: matched && mxVerified ? 'high' : matched ? 'medium' : 'low',
    source: 'known-domain',
  };
};

// Recherche du domaine via DuckDuckGo (best-effort ; peut être bloqué côté serveur).
const DIRECTORIES = [
  'pagesjaunes', 'societe.com', 'facebook.', 'linkedin.', 'instagram.', 'google.', 'mappy',
  'tripadvisor', 'wikipedia', 'pappers', 'kompass', '118000', 'indeed', 'hellowork',
  'leboncoin', '.gouv.fr', 'annuaire', 'duckduckgo',
];
const resolveDomainViaSearch = async (companyName: string, city: string | undefined, deadline: number): Promise<string | null> => {
  if (Date.now() > deadline) return null;
  const html = await fetchPage('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(`${companyName} ${city || ''}`.trim()));
  if (!html) return null;
  for (const m of html.matchAll(/uddg=([^"&]+)/g)) {
    try {
      const host = new URL(decodeURIComponent(m[1])).hostname.replace(/^www\./, '');
      if (!DIRECTORIES.some((d) => host.includes(d))) return host;
    } catch {
      /* lien malformé → suivant */
    }
  }
  return null;
};

// Cache mémoire 24 h (clé = domaine connu, sinon nom|ville) pour ne pas re-scraper.
const cache = new Map<string, { at: number; result: DetectResult | null }>();
const TTL_MS = 24 * 3600 * 1000;

export const contactDetector = {
  isPlaceholderEmail,
  siteMatchesCompany,

  /**
   * Détecte un email employeur exploitable. Best-effort : renvoie null si rien de fiable.
   * `budgetMs` borne le temps total (utile quand appelé dans un flux synchrone comme /prepare).
   */
  detect: async (input: DetectInput, budgetMs = 9000): Promise<DetectResult | null> => {
    const key = (input.knownDomain ? cleanDomain(input.knownDomain) : `${input.companyName}|${input.city || ''}`).toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.result;

    const deadline = Date.now() + budgetMs;
    let result: DetectResult | null = null;
    try {
      let domain = input.knownDomain ? cleanDomain(input.knownDomain) : null;
      let viaSearch = false;
      if (!domain) {
        domain = await resolveDomainViaSearch(input.companyName, input.city, deadline);
        viaSearch = true;
      }
      if (domain) {
        result = await scrapeDomain(domain, input.companyName, input.city, deadline);
        if (result && viaSearch) result.source = 'web-search';
      }
    } catch {
      result = null;
    }
    cache.set(key, { at: Date.now(), result });
    return result;
  },
};
