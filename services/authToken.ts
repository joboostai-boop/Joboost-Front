// Gestion du token d'authentification persistant (localStorage).
//
// Pourquoi : en production le cookie de session est `SameSite=None; Secure`,
// donc traité comme un cookie tiers (front et back sur des domaines différents).
// Les navigateurs mobiles (Safari iOS / ITP, Chrome) bloquent ces cookies tiers,
// ce qui déconnecte l'utilisateur au moindre rechargement → retour à la landing page.
//
// Solution : on stocke aussi le JWT en localStorage et on l'envoie via le header
// `Authorization: Bearer <token>`. Le backend lit déjà ce header en fallback du
// cookie (voir backend/src/middleware/auth.middleware.ts).

const TOKEN_KEY = 'joboost-token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token?: string | null): void => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* localStorage indisponible (mode privé strict) : on ignore silencieusement */
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op */
  }
};

// Header d'authentification à fusionner dans les requêtes fetch.
export const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Récupère le JWT que le backend place dans le fragment d'URL (#token=...) au
 * retour d'un login Google, puis nettoie l'URL.
 *
 * ⚠️ DOIT être appelé AVANT le premier rendu React (cf. index.tsx).
 *
 * Ce traitement vivait auparavant dans un `useEffect` de l'AuthProvider, donc il
 * s'exécutait APRÈS le premier affichage. À ce moment-là l'utilisateur n'est pas
 * encore authentifié et l'URL de retour (/dashboard) est inconnue du routeur :
 * celui-ci redirigeait aussitôt vers la page d'authentification, ce qui
 * DÉTRUISAIT le fragment avant qu'on ait pu y lire le jeton. Le login Google
 * renvoyait donc l'utilisateur sur l'écran de connexion au lieu de le faire
 * entrer. En lisant le fragment avant le rendu, `getToken()` répond dès la
 * première passe et l'app démarre authentifiée.
 */
export const captureTokenFromUrl = (): void => {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('token=')) return;
    const token = new URLSearchParams(hash.slice(1)).get('token');
    if (!token) return;
    setToken(token);
    // On retire le jeton de la barre d'adresse et de l'historique.
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  } catch {
    /* no-op */
  }
};
