import express from 'express';
import cors from 'cors';
import { extractOffer, closeBrowser } from './extract';

// ====================================================================
//  Micro-service de scraping d'offres d'emploi (Puppeteer).
//  Exposé au seul backend JobBoost (protégé par SCRAPER_SECRET).
//  Endpoint : POST /extract { url } -> { ok, title, text, reason }
// ====================================================================

const PORT = Number(process.env.PORT) || 4100;
const SCRAPER_SECRET = process.env.SCRAPER_SECRET || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Authentification optionnelle par secret partagé (recommandée en prod).
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (SCRAPER_SECRET && req.header('x-scraper-key') !== SCRAPER_SECRET) {
    return res.status(401).json({ ok: false, reason: 'unauthorized' });
  }
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'joboost-scraper' }));

app.post('/extract', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, reason: 'missing_url' });
  }
  try {
    const result = await extractOffer(url);
    res.json(result);
  } catch (e: any) {
    console.error('[scraper] erreur:', e?.message || e);
    res.status(500).json({ ok: false, reason: 'internal_error' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[scraper] à l'écoute sur :${PORT}`);
});

// Arrêt propre : ferme le navigateur Puppeteer.
const shutdown = async () => {
  await closeBrowser();
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
