import puppeteer, { Browser } from 'puppeteer';
import { assertSafeUrl, ScrapeError } from './ssrf';

// ====================================================================
//  Extraction du contenu texte d'une page d'offre via Puppeteer.
//  - réutilise un seul navigateur headless (coûteux à lancer),
//  - bloque images/polices/CSS pour aller vite,
//  - nettoie le DOM (nav/footer/scripts) et renvoie le texte principal.
//
//  Limite connue : les sites à mur d'authentification (LinkedIn, Indeed…)
//  renvoient une page de connexion → on le détecte et on remonte
//  `reason: 'auth_wall'` pour que l'UI invite à coller le texte.
// ====================================================================

const NAV_TIMEOUT = 20_000;
const MAX_TEXT = 6_000;

export interface ExtractResult {
  ok: boolean;
  title?: string;
  text?: string;
  length?: number;
  reason?: string;
}

let browserPromise: Promise<Browser> | null = null;

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    // Si le lancement échoue, on réinitialise pour permettre un nouvel essai.
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  const browser = await browserPromise;
  // Navigateur fermé entre-temps (crash) → on le relance.
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
};

export const closeBrowser = async (): Promise<void> => {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    browserPromise = null;
    if (b) await b.close().catch(() => undefined);
  }
};

// Marqueurs de pages inutilisables (murs d'auth, pages d'erreur, sélecteurs de langue).
// Indépendant de la longueur : LinkedIn déconnecté renvoie une page « introuvable »
// multilingue de 6000+ caractères qui passerait un simple test de taille.
const NOT_FOUND = /(page not found|page introuvable|impossible de trouver cette page|nous ne trouvons pas la page|this page (?:doesn'?t|does not) exist|cette page n'existe pas)/i;
const AUTH_KEYWORDS = /(se connecter pour|connectez-vous pour|sign in to|log in to|join now|create an account|s'identifier pour|accès réservé)/i;
const GUEST_SPAM = /(go to your feed|ouvrez votre fil|user agreement|conditions générales d'utilisation de linkedin)/i;

const looksUnusable = (title: string, text: string): { unusable: boolean; reason?: string } => {
  const haystack = `${title}\n${text}`.toLowerCase();

  if (NOT_FOUND.test(haystack)) return { unusable: true, reason: 'not_found' };

  // Page très majoritairement composée d'un sélecteur de langue / pied de page légal
  // (signature des pages "invité" de LinkedIn) → contenu inexploitable.
  const langPickerHits = (haystack.match(/\((?:bahasa|german|spanish|korean|japanese|chinese|dutch|polish|russian|swedish|turkish|arabic|french)\)/g) || []).length;
  if (langPickerHits >= 5) return { unusable: true, reason: 'auth_wall' };
  if (GUEST_SPAM.test(haystack) && text.length < 2500) return { unusable: true, reason: 'auth_wall' };

  // Mur d'authentification classique sur page courte.
  if (text.length < 800 && AUTH_KEYWORDS.test(haystack)) return { unusable: true, reason: 'auth_wall' };

  return { unusable: false };
};

export const extractOffer = async (rawUrl: string): Promise<ExtractResult> => {
  let safeUrl: string;
  try {
    safeUrl = await assertSafeUrl(rawUrl);
  } catch (e) {
    return { ok: false, reason: e instanceof ScrapeError ? e.reason : 'invalid_url' };
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') {
        req.abort().catch(() => undefined);
      } else {
        req.continue().catch(() => undefined);
      }
    });

    await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    // Laisse le temps au contenu rendu côté client de s'afficher.
    await new Promise((r) => setTimeout(r, 1500));

    const { title, text } = await page.evaluate(() => {
      const KILL = ['script', 'style', 'noscript', 'svg', 'nav', 'header', 'footer', 'form', 'aside'];
      KILL.forEach((sel) =>
        document.querySelectorAll(sel).forEach((el) => el.parentNode?.removeChild(el)),
      );
      const root = (document.querySelector('main') as HTMLElement) || document.body;
      const raw = (root?.innerText || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      return { title: document.title || '', text: raw };
    });

    if (!text || text.length < 80) {
      return { ok: false, reason: 'empty', title };
    }
    const unusable = looksUnusable(title, text);
    if (unusable.unusable) {
      return { ok: false, reason: unusable.reason, title };
    }

    const clipped = text.slice(0, MAX_TEXT);
    return { ok: true, title, text: clipped, length: clipped.length };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/timeout/i.test(msg)) return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'navigation_failed' };
  } finally {
    await page.close().catch(() => undefined);
  }
};
