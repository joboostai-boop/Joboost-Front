import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { hasFullAccess, trialDaysLeft } from '../services/usage.service';

/**
 * Réserve une route aux comptes ayant l'accès complet : abonnement Élite actif,
 * essai encore en cours, ou compte propriétaire (OWNER_EMAILS).
 *
 * Décision produit de Sana (2026-07-30) : les candidatures spontanées ne sont plus
 * accessibles aux comptes gratuits.
 *
 * Ce n'est pas seulement commercial. Ces candidatures partent par e-mail depuis
 * contact@joboost.app via le compte Brevo : un usage abusif ferait classer le
 * domaine en spam, ce qui casserait AUSSI les e-mails transactionnels — la
 * réinitialisation de mot de passe comprise. Le verrou protège la délivrabilité
 * autant que le chiffre d'affaires.
 */
const ownerEmails = (): Set<string> =>
  new Set(
    (process.env.OWNER_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );

export const requireFullAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, subscriptionStatus: true, createdAt: true },
    });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Compte introuvable.' });
    }

    // Comptes propriétaires : illimités, comme partout ailleurs.
    if (user.email && ownerEmails().has(user.email.toLowerCase())) return next();

    if (hasFullAccess(user)) return next();

    // 403 + code exploitable par le front pour ouvrir la fenêtre d'abonnement.
    return res.status(403).json({
      success: false,
      code: 'SUBSCRIPTION_REQUIRED',
      trialDaysLeft: trialDaysLeft(user.createdAt),
      error:
        "Les candidatures spontanées sont réservées à l'abonnement Élite. Ton essai est terminé.",
    });
  } catch (err) {
    return next(err);
  }
};
