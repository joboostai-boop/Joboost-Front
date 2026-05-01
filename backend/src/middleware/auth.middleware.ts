import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: string;
      organizationId?: string;
    }
  }
}



export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Lire le token depuis le cookie HTTP-Only (ou header)
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Non authentifié. Token manquant.' });
    }

    // 2. Vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 3. Injecter les données dans la requête
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.organizationId = decoded.organizationId;
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré.' });
  }
};
