import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

/**
 * Middleware qui vérifie que l'utilisateur a un abonnement actif.
 * À utiliser après requireAuth sur les routes premium.
 */
export const requirePro = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié',
        code: 'UNAUTHENTICATED',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });

    if (!user || user.subscriptionStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Un abonnement Pro actif est requis pour accéder à cette fonctionnalité.',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    next();
  } catch (error) {
    console.error('requirePro middleware error:', error);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
