import { prisma } from '../db';

/**
 * Adresses email des comptes : validation + recherche insensible à la casse.
 *
 * Deux défauts constatés en production le 30/07 sur les premiers vrais inscrits :
 *  1. `jean@gmail` (domaine sans point) créait un compte injoignable — aucun email ne
 *     part, donc pas de réinitialisation possible. La validation HTML `type="email"`
 *     du navigateur ne bloque pas ce cas : elle n'exige pas de point dans le domaine.
 *  2. Un email stocké avec des majuscules (« Prenom.Nom@… ») était introuvable dès que
 *     la personne le retapait en minuscules, ou se connectait via Google (qui renvoie
 *     toujours l'email en minuscules) → second compte créé, documents « disparus ».
 */

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const isValidEmail = (raw: unknown): boolean =>
  typeof raw === 'string' && EMAIL_RE.test(raw.trim());

export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

/** Retrouve un compte quelle que soit la casse saisie (comptes historiques inclus). */
export const findUserByEmail = (email: string) =>
  prisma.user.findFirst({ where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } } });
