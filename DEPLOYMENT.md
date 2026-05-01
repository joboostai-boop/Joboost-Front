# Checklist de Déploiement : JobBoost

JobBoost est désormais prêt pour un environnement pilote B2B ou utilisateur de test. Ce guide liste les prérequis et actions nécessaires pour migrer le mode développement (local) vers une première instance serveur de test (Staging / VPS).

## 1. Variables d'Environnement (Backend)
Dans le dossier `backend`, créer un fichier `.env` avec ces trois clés :

```bash
# Port d'écoute du serveur Node.js
PORT=5000

# Clé de l'IA (Google Gemini) - OBLIGATOIRE pour les fonctionnalités co-pilote
GEMINI_API_KEY="votre-vraie-clef-ici"

# URL de connexion à PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/joboost?schema=public"
```

## 2. Procédure de Seed & Build (Backend)

Lancez ces commandes pour initialiser la base de données :

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run build
```

Pour lancer le backend en production via PM2 (ou direct) :
```bash
npm run start
```

## 3. Configuration Frontend

Assurez-vous que le composant de proxy (lorsque vous utilisez `npm run dev`) est adéquatement remplacé par des redirections Nginx, ou configurez un `.env` côté React pour pointer sur l'API externe.

Actuellement dans le code (`services/gemini.ts` et autres fetchs), l'URL est relative : `/api/...` ou `http://localhost:5000/api/...`. 

```bash
npm install
npm run build
```

## 4. Limites Actuelles "MVP readiness"

1. **Authentication** : Le backend est actuellement en "Single Tenant" (`user.findFirst()`). Cela fonctionnera pour une démo isolée ou un B2B monoposte. Si vous voulez vendre à l'échelle (Self-Serve), le `UserId` doit être récupéré par un vrai token JWT ou OAuth, branché sur la page "Connexion" qui saute le mock.
2. **La Bonne Boîte** et **Vraies offres** : Le module `lbb.controller.ts` est toujours mocké. Il nécessitera d'appeler l'API Pole Emploi via `axios`. Idem pour `opportunity.controller.ts`.
