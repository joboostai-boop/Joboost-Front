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
  siren?: string;       // 9 chiffres : s'il figure sur le site, c'est la bonne entreprise
}

export interface DetectResult {
  email: string;
  domain: string;
  mxVerified: boolean;
  confidence: 'high' | 'medium' | 'low';
  source: 'known-domain' | 'web-search' | 'guessed-domain';
  /** Le SIREN de l'entreprise a été trouvé sur le site (preuve d'identité). */
  sirenVerified?: boolean;
  /** Présentation de l'entreprise tirée de son site (sert à personnaliser la lettre). */
  siteSummary?: string;
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

// ----- Choix de la meilleure adresse parmi celles du site -----
// Adresses qui ne liront jamais une candidature (protection des données, boutique,
// marketing, facturation, robots…) : écartées.
const REJECT_LOCAL = /(dpo|rgpd|gdpr|privacy|datenschutz|donnees|cnil|no-?reply|ne-?pas-?repondre|newsletter|marketing|press|presse|media|compta|factur|invoice|billing|paiement|e-?shop|boutique|shop|commande|order|sav|retour|feedback|abuse|webmaster|postmaster|admin|support|hotline|investor|actionnaire|fournisseur|achat|purchas|legal|juridique|china|export)/i;
// Adresses à privilégier, dans cet ordre.
const PREFER_LOCAL: RegExp[] = [
  /(recrut|recruit|rh|drh|hr|job|emploi|carriere|career|talent|candidat)/i,
  /^(contact|info|infos|bonjour|hello|accueil|direction|secretariat|agence|commercial)\b/i,
];
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export const pickBestEmail = (emails: string[], domain: string): string | null => {
  const sameDomain = Array.from(new Set(emails.map((e) => e.toLowerCase())))
    .filter((e) => e.split('@')[1] === domain || e.split('@')[1]?.endsWith('.' + domain))
    .filter((e) => !isPlaceholderEmail(e) && !REJECT_LOCAL.test(e.split('@')[0]) && !/\.(png|jpe?g|gif|webp|svg)$/.test(e));
  for (const re of PREFER_LOCAL) {
    const hit = sameDomain.find((e) => re.test(e.split('@')[0]));
    if (hit) return hit;
  }
  return sameDomain[0] || null;
};

// Présentation courte de l'entreprise : description du site, sinon premiers paragraphes.
const siteSummaryOf = (html: string): string | undefined => {
  const meta = html.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']{40,})["']/i)
    || html.match(/<meta[^>]+content=["']([^"']{40,})["'][^>]+(?:name|property)=["'](?:og:)?description["']/i);
  const clean = (t: string) => t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  if (meta) return clean(meta[1]).slice(0, 400);
  const paras = Array.from(html.matchAll(/<p[^>]*>([\s\S]{60,600}?)<\/p>/gi)).map((m) => clean(m[1])).filter((t) => t.length > 60);
  return paras.length ? paras.slice(0, 2).join(' ').slice(0, 400) : undefined;
};

const sirenOnPage = (html: string, siren?: string): boolean => {
  if (!siren || !/^\d{9}$/.test(siren)) return false;
  const digits = html.replace(/[\s\u00a0.]/g, '');
  return digits.includes(siren);
};

// Domaines plausibles à partir du nom (sans moteur de recherche) : « ESKER SA » → esker.fr, esker.com…
const LEGAL_WORDS = /\b(sa|sas|sasu|sarl|eurl|sci|snc|selarl|soc|ste|societe|groupe|group|holding|france|et|de|la|le|les|des|du|l|d)\b/g;
export const guessDomains = (name: string): string[] => {
  const base = normalize(name).replace(LEGAL_WORDS, ' ');
  const words = base.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const stems = [words.join(''), words.join('-'), words[0]].filter((w) => w.length >= 3);
  const out: string[] = [];
  for (const st of Array.from(new Set(stems))) for (const tld of ['fr', 'com']) out.push(`${st}.${tld}`);
  return out.slice(0, 6);
};

const domainResolves = async (d: string): Promise<boolean> => {
  try { await dns.resolve(d); return true; } catch { return false; }
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

const scrapeDomain = async (domain: string, input: DetectInput, deadline: number): Promise<DetectResult | null> => {
  let matched = false;
  let sirenVerified = false;
  let summary: string | undefined;
  const emails: string[] = [];
  outer: for (const base of [`https://${domain}`, `https://www.${domain}`]) {
    for (const p of CONTACT_PATHS) {
      if (Date.now() > deadline) break outer; // budget de temps dépassé
      const html = await fetchPage(base + p);
      if (!html) continue;
      if (!summary && p === '') summary = siteSummaryOf(html);
      if (!matched && siteMatchesCompany(html, input.companyName, input.city)) matched = true;
      if (!sirenVerified && sirenOnPage(html, input.siren)) sirenVerified = true;
      const decoded = html.replace(/%40/gi, '@').replace(/&#64;/g, '@').replace(/\s?\[at\]\s?|\s?\(at\)\s?/gi, '@');
      for (const m of decoded.match(EMAIL_RE) || []) emails.push(m);
      if (sirenVerified && pickBestEmail(emails, domain)) break outer;
    }
    if (emails.length) break; // le site a répondu sur la première base : inutile de tester www.
  }
  const best = pickBestEmail(emails, domain);
  if (!best) return null;
  const mxVerified = await mxOk(best);
  // Sûr = SIREN trouvé sur le site (preuve d'identité) et domaine qui reçoit des e-mails.
  // Sans SIREN : jamais « sûr » si le domaine a été deviné (homonymes : opera.com…).
  const confidence: DetectResult['confidence'] =
    sirenVerified && mxVerified ? 'high'
      : matched && mxVerified && input.knownDomain ? 'high'
      : matched && mxVerified ? 'medium'
      : 'low';
  return { email: best, domain, mxVerified, confidence, source: 'known-domain', sirenVerified, siteSummary: summary };
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

const rank = (r: DetectResult) => (r.sirenVerified ? 4 : 0) + ({ high: 3, medium: 2, low: 1 } as const)[r.confidence];

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
    const key = (input.knownDomain ? cleanDomain(input.knownDomain) : `${input.companyName}|${input.city || ''}|${input.siren || ''}`).toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.result;

    const deadline = Date.now() + budgetMs;
    let result: DetectResult | null = null;
    try {
      if (input.knownDomain) {
        result = await scrapeDomain(cleanDomain(input.knownDomain), input, deadline);
      } else {
        // 1. Domaines devinés depuis le nom (rapide, sans moteur de recherche).
        for (const d of guessDomains(input.companyName)) {
          if (Date.now() > deadline) break;
          if (!(await domainResolves(d))) continue;
          const r = await scrapeDomain(d, input, deadline);
          if (r) { r.source = 'guessed-domain'; if (!result || rank(r) > rank(result)) result = r; }
          if (result?.sirenVerified) break;
        }
        // 2. Repli : recherche web (souvent bloquée depuis un serveur).
        if (!result || result.confidence === 'low') {
          const domain = await resolveDomainViaSearch(input.companyName, input.city, deadline);
          if (domain) {
            const r = await scrapeDomain(domain, input, deadline);
            if (r && (!result || rank(r) > rank(result))) { r.source = 'web-search'; result = r; }
          }
        }
      }
    } catch {
      result = null;
    }
    cache.set(key, { at: Date.now(), result });
    return result;
  },
};
