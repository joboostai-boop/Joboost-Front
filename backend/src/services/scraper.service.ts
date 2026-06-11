// ====================================================================
//  Client du micro-service de scraping (Puppeteer).
//  Appelé en mode « Lien URL » de la lettre IA. Si SCRAPER_URL n'est pas
//  configuré ou que le service est injoignable, on renvoie { ok:false } :
//  l'appelant retombe alors proprement sur le mode texte.
// ====================================================================

const SCRAPER_URL = (process.env.SCRAPER_URL || '').replace(/\/$/, '');
const SCRAPER_SECRET = process.env.SCRAPER_SECRET || '';
const TIMEOUT_MS = 25_000;

export const isScraperConfigured = (): boolean => Boolean(SCRAPER_URL);

export interface OfferExtraction {
  ok: boolean;
  title?: string;
  text?: string;
  reason?: string;
}

export const scraperService = {
  extractOffer: async (url: string): Promise<OfferExtraction> => {
    if (!SCRAPER_URL) return { ok: false, reason: 'not_configured' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${SCRAPER_URL}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SCRAPER_SECRET ? { 'x-scraper-key': SCRAPER_SECRET } : {}),
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        return { ok: false, reason: json?.reason || `http_${res.status}` };
      }
      return { ok: true, title: json.title, text: json.text };
    } catch (e: any) {
      return { ok: false, reason: e?.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  },
};
