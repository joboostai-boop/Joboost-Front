# JobBoost — Micro-service de scraping (Puppeteer)

Extrait le texte d'une page d'offre d'emploi pour alimenter la génération de
lettres de motivation IA (mode « Lien URL »).

## Pourquoi un service séparé ?
Chromium est gourmand en mémoire. L'isoler du backend principal évite qu'un pic
mémoire du navigateur fasse tomber l'API. Le backend l'appelle via `SCRAPER_URL`
et **retombe proprement** en mode texte si le service est absent/injoignable.

## Endpoints
- `GET /health` → `{ ok: true }`
- `POST /extract` `{ "url": "https://…" }` →
  `{ ok, title, text, length }` en cas de succès,
  `{ ok: false, reason }` sinon (`auth_wall`, `timeout`, `blocked_private_ip`, `empty`…).

En-tête requis si `SCRAPER_SECRET` est défini : `x-scraper-key: <secret>`.

## Limites connues
LinkedIn, Indeed et la plupart des grands jobboards imposent un mur
d'authentification : l'extraction renvoie alors `reason: 'auth_wall'`. Le service
fonctionne surtout sur les **pages carrière d'entreprises et ATS publics**
(Welcome to the Jungle public, Greenhouse, Lever, sites d'entreprise…).
Pour ces cas bloqués, l'UI invite l'utilisateur à coller le texte de l'offre.

## Lancer en local
```bash
cd scraper-service
npm install            # télécharge Chromium (postinstall Puppeteer)
npm run dev            # http://localhost:4100
# test :
curl -X POST http://localhost:4100/extract -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Déploiement Render (nouveau Web Service)
- Root Directory : `scraper-service`
- Build Command  : `npm install && npm run build`
- Start Command  : `npm start`
- Variables d'env : `SCRAPER_SECRET` (même valeur que côté backend)
- Puppeteer télécharge Chromium au build ; aucun buildpack spécifique requis sur
  les images Render récentes. Si Chromium manque, définir
  `PUPPETEER_EXECUTABLE_PATH` vers un Chrome installé.

Côté **backend principal**, ajouter dans Render :
- `SCRAPER_URL` = URL publique du service (ex. `https://joboost-scraper.onrender.com`)
- `SCRAPER_SECRET` = même secret que ci-dessus
