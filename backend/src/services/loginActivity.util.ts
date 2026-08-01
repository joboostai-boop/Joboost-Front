import { prisma } from '../db';

/**
 * Horodate la dernière connexion réussie.
 *
 * Volontairement « fire-and-forget » : une écriture de confort ne doit jamais faire
 * échouer ni ralentir une connexion. Toute erreur est avalée après trace en console.
 * Appelé depuis la connexion email/mot de passe et depuis les trois OAuth.
 */
export const touchLastLogin = (userId: string): void => {
  prisma.user
    .update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
    .catch((err) => console.error('lastLoginAt non mis à jour :', err?.message || err));
};
