import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { JWT_SECRET } from '../config';


const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
};

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const { email, password, name, acceptedTerms, marketingOptIn } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: "Email, mot de passe et nom sont requis." });
      }

      if (!acceptedTerms) {
        return res.status(400).json({ success: false, error: "Vous devez accepter les CGU et la politique de confidentialité." });
      }

      // Vérication existence
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, error: "Cet email est déjà utilisé." });
      }

      // Hashage mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          acceptedTermsAt: new Date(),
          marketingOptIn: marketingOptIn === true,
        }
      });

      // Générer JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, COOKIE_OPTIONS);
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de l'inscription." });
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email et mot de passe requis." });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) {
        return res.status(401).json({ success: false, error: "Identifiants invalides." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Identifiants invalides." });
      }

      // Générer JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, COOKIE_OPTIONS);

      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de la connexion." });
    }
  },

  businessLogin: async (req: Request, res: Response) => {
    try {
      // ⚠️ SÉCURITÉ / RGPD : cet accès "démo" connecte sans identifiant et donne
      // accès à des données personnelles de candidats (art. 32 RGPD). Il est donc
      // DÉSACTIVÉ par défaut et n'est utilisable qu'en local/démo via la variable
      // d'environnement ENABLE_DEMO_BUSINESS_LOGIN=true. En production, les
      // partenaires doivent se connecter avec leurs identifiants via /api/auth/login.
      if (process.env.ENABLE_DEMO_BUSINESS_LOGIN !== 'true') {
        return res.status(403).json({
          success: false,
          error: "L'accès partenaire nécessite une connexion avec identifiants.",
        });
      }

      // Find any existing business partner, or create one
      let user = await prisma.user.findFirst({
        where: { role: 'BUSINESS_PARTNER' },
      });

      if (!user) {
        // Use upsert to handle race conditions and potential email conflicts
        user = await prisma.user.upsert({
          where: { email: 'partenaire@missionlocale.fr' },
          update: { role: 'BUSINESS_PARTNER' },
          create: {
            email: 'partenaire@missionlocale.fr',
            name: 'Mission Locale de Paris',
            role: 'BUSINESS_PARTNER',
            plan: 'Pro',
            city: 'Paris, France',
            phone: '+33 1 44 55 66 77',
            skills: [],
          },
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, COOKIE_OPTIONS);

      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      console.error('Business login error:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || "Erreur lors de la connexion partenaire." });
    }
  },

  logout: (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Déconnecté" });
  },

  me: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) {
        return res.status(404).json({ success: false, error: "Utilisateur non trouvé." });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Erreur serveur." });
    }
  }
};
