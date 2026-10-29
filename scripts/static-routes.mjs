// Après `vite build` : copie index.html dans un dossier par page publique.
//
// Sur Render, la règle SPA « /* → /index.html » est en mode Redirect (301) et non
// Rewrite : une adresse directe comme joboost.app/auth/register était renvoyée vers
// /index.html, l'adresse d'origine perdue, et le visiteur atterrissait sur la
// connexion. Render sert un fichier existant avant d'appliquer ses règles, donc avec
// une vraie page à chaque adresse publique, les liens des pubs et des e-mails
// marchent quel que soit le réglage du tableau de bord.
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROUTES = [
  'tarifs',
  'auth/login', 'auth/register', 'auth/forgot', 'auth/reset',
  'legal/mentions', 'legal/confidentialite', 'legal/cgu', 'legal/cgv',
  // Espace connecté : un lien d'e-mail (ex. /track) doit rouvrir la bonne page.
  'home', 'track', 'pricing', 'settings',
  'target/offers', 'target/lbb', 'target/alternance', 'target/saved',
  'prepare/profile', 'prepare/cv', 'prepare/letter', 'prepare/templates',
  'business/dashboard', 'business/offers', 'business/jobseekers', 'business/stats', 'business/billing',
];

for (const r of ROUTES) {
  mkdirSync(join('dist', r), { recursive: true });
  copyFileSync(join('dist', 'index.html'), join('dist', r, 'index.html'));
}
console.log(`static-routes : ${ROUTES.length} pages`);
