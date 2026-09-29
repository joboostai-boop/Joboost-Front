/**
 * Utilitaires d'authentification partagés : cookie de session, politique de mot de
 * passe, et nettoyage des champs sensibles avant d'envoyer un utilisateur au navigateur.
 */

/** Longueur minimale d'un mot de passe (inscription, réinitialisation, changement). */
export const MIN_PASSWORD_LENGTH = 6;

const isProd = process.env.NODE_ENV === 'production';

/**
 * Cookie de session. En prod le front (joboost.app) et l'API (onrender.com) sont sur
 * des domaines différents → SameSite=None; Secure.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
};

/**
 * Options pour EFFACER le cookie : mêmes attributs que le cookie posé (hors maxAge).
 * Sans SameSite=None/Secure, le navigateur rejette la suppression en prod et la
 * session survit à la déconnexion / à la suppression du compte.
 */
export const CLEAR_COOKIE_OPTIONS = (() => {
  const { maxAge: _ignored, ...rest } = COOKIE_OPTIONS;
  return rest;
})();

/**
 * Champs qui ne doivent JAMAIS quitter le serveur dans une réponse utilisateur :
 * hash du mot de passe, jetons France Travail, jeton de réinitialisation.
 */
const SENSITIVE_USER_FIELDS = [
  'password',
  'ftAccessToken',
  'ftRefreshToken',
  'resetTokenHash',
  'resetTokenExpiry',
] as const;

export const sanitizeUser = <T extends Record<string, any>>(user: T): Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]> => {
  const safe: Record<string, any> = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) delete safe[field];
  return safe as Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]>;
};
