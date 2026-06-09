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
