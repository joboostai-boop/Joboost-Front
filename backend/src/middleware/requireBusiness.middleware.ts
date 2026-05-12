import { Request, Response, NextFunction } from 'express';

/**
 * Middleware qui vérifie que l'utilisateur connecté a le rôle BUSINESS_PARTNER.
 * À utiliser après requireAuth sur toutes les routes /api/business/*.
 */
export const requireBusinessRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié',
    });
  }

  if (req.role !== 'BUSINESS_PARTNER') {
    return res.status(403).json({
      success: false,
      error: 'Accès réservé aux partenaires business',
    });
  }

  next();
};
