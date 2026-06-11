// Génère public/og-image.png (1200×630) pour les aperçus de partage (Open Graph).
// Réutilise le Chromium de Puppeteer déjà installé dans ce service.
// Usage : node scripts/gen-og.js
const puppeteer = require('puppeteer');
const path = require('path');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}</style></head>
<body>
<div style="width:1200px;height:630px;background:linear-gradient(135deg,#4F46E5 0%,#7D5CFF 55%,#6D28D9 100%);font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:96px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-120px;right:-120px;width:420px;height:420px;background:rgba(255,255,255,.08);border-radius:50%"></div>
  <div style="position:absolute;bottom:-160px;left:-80px;width:380px;height:380px;background:rgba(255,255,255,.06);border-radius:50%"></div>
  <div style="position:absolute;top:74px;right:96px;font-size:48px;font-weight:800;letter-spacing:-1px">Jo<span style="color:#C7D2FE">Boost</span></div>
  <div style="font-size:26px;font-weight:800;letter-spacing:5px;text-transform:uppercase;opacity:.85;margin-bottom:34px">⚡ Propulsé par l'IA générative</div>
  <div style="font-size:104px;font-weight:800;line-height:1.04;letter-spacing:-2px">L'IA au service<br/>de votre <span style="color:#C7D2FE">carrière</span></div>
  <div style="font-size:34px;font-weight:500;opacity:.92;margin-top:36px;max-width:920px;line-height:1.4">CV, lettres et candidatures sur-mesure — décrochez plus d'entretiens.</div>
</div>
</body></html>`;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600)); // laisse la police se rendre
  const out = path.resolve(__dirname, '../../public/og-image.png');
  await page.screenshot({ path: out, type: 'png' });
  await browser.close();
  console.log('OG image écrite :', out);
})();
