import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { isSubscribed, trialDaysLeft } from '../services/usage.service';

/**
 * Réserve une route aux comptes ABONNÉS (ou compte propriétaire, OWNER_EMAILS).
 *
 * Décision produit de Sana (2026-07-30) : les candidatures spontanées ne sont plus
 * accessibles aux comptes gratuits.
 *
 * Décision produit de Sana (2026-08-16) : les candidatures spontanées ne sont plus
 * incluses dans l'essai de 7 jours non plus — abonnement réel exigé dès le départ.
 * Raison : l'essai complet (spontanées comprises) laissait les candidats les plus
 * actifs décrocher ce qu'ils cherchaient gratuitement pendant l'essai, puis partir
 * sans jamais convertir. Le CV et les lettres restent en accès complet pendant
 * l'essai — seules les spontanées, la fonctionnalité la plus forte du produit,
 * exigent maintenant un abonnement réel, dès le premier jour.
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

export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
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

    if (isSubscribed(user.subscriptionStatus)) return next();

    // 403 + code exploitable par le front pour ouvrir la fenêtre d'abonnement.
    // trialDaysLeft reste renvoyé (même si non utilisé ici pour l'accès) : le
    // front peut s'en servir pour préciser le message ("encore N jours d'essai,
    // mais les spontanées demandent déjà l'abonnement").
    return res.status(403).json({
      success: false,
      code: 'SUBSCRIPTION_REQUIRED',
      trialDaysLeft: trialDaysLeft(user.createdAt),
      error: "Les candidatures spontanées sont réservées à l'abonnement Élite.",
    });
  } catch (err) {
    return next(err);
  }
};
