import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { JWT_SECRET, FRONTEND_URL } from '../config';
import { emailService } from '../services/email.service';
import { isValidEmail, normalizeEmail, findUserByEmail } from '../services/userEmail.util';

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');


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
      const { email: rawEmail, password, name, acceptedTerms, marketingOptIn } = req.body;

      if (!rawEmail || !password || !name) {
        return res.status(400).json({ success: false, error: "Email, mot de passe et nom sont requis." });
      }

      if (!isValidEmail(rawEmail)) {
        return res.status(400).json({ success: false, error: "Cette adresse email n'est pas valide. Vérifiez le domaine (ex. nom@gmail.com)." });
      }
      const email = normalizeEmail(rawEmail);

      if (!acceptedTerms) {
        return res.status(400).json({ success: false, error: "Vous devez accepter les CGU et la politique de confidentialité." });
      }

      // Vérication existence
      const existing = await findUserByEmail(email);
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
      // token renvoyé aussi dans le body : fallback header Bearer pour les mobiles
      // où le cookie tiers (SameSite=None) est bloqué.
      res.status(201).json({ success: true, user: userWithoutPassword, token });
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

      const user = await findUserByEmail(email);
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
      // token renvoyé aussi dans le body : fallback header Bearer pour les mobiles
      // où le cookie tiers (SameSite=None) est bloqué.
      res.json({ success: true, user: userWithoutPassword, token });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de la connexion." });
    }
  },

  // Demande de réinitialisation : génère un token, l'envoie par email. Réponse TOUJOURS
  // identique (succès) que l'email existe ou non → anti-énumération de comptes.
  requestPasswordReset: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const genericOk = () => res.json({ success: true, message: "Si un compte existe, un email de réinitialisation vient d'être envoyé." });

      if (!email || typeof email !== 'string') return genericOk();

      const user = await findUserByEmail(email);
      // Pas de compte, ou compte OAuth-only (sans mot de passe) → on ne fait rien mais on répond pareil.
      if (!user || !user.password) return genericOk();

      const rawToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = hashToken(rawToken);
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash, resetTokenExpiry } });

      // On repart de l'email STOCKÉ (et non de la saisie) : le lien de réinitialisation
      // désigne ainsi toujours le compte retrouvé, quelle que soit la casse tapée.
      const resetUrl = `${FRONTEND_URL}/auth/reset?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
      const result = await emailService.sendPasswordReset({ to: user.email, name: user.name, resetUrl });
      if (!result.sent) {
        // Envoi impossible (aucun transport configuré) : on ne laisse pas un token pendouiller.
        await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: null, resetTokenExpiry: null } });
        console.error('Password reset email non envoyé :', result.error || 'aucun transport email configuré');
        return res.status(503).json({ success: false, error: "L'envoi d'emails n'est pas encore activé. Contactez le support à joboost.ai@gmail.com." });
      }
      return genericOk();
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la demande de réinitialisation.' });
    }
  },

  // Réinitialisation effective : vérifie le token (hashé, non expiré) et change le mot de passe.
  resetPassword: async (req: Request, res: Response) => {
    try {
      const { email, token, password } = req.body;
      if (!email || !token || !password) {
        return res.status(400).json({ success: false, error: 'Lien invalide ou incomplet.' });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' });
      }

      const user = await findUserByEmail(email);
      if (!user || !user.resetTokenHash || !user.resetTokenExpiry) {
        return res.status(400).json({ success: false, error: 'Lien invalide ou déjà utilisé.' });
      }
      if (user.resetTokenExpiry.getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: 'Lien expiré. Refaites une demande.' });
      }
      if (hashToken(token) !== user.resetTokenHash) {
        return res.status(400).json({ success: false, error: 'Lien invalide.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetTokenHash: null, resetTokenExpiry: null },
      });
      return res.json({ success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la réinitialisation.' });
    }
  },

  // Inscription recruteur en self-service : crée une organisation + un compte
  // BUSINESS_PARTNER avec identifiants (email + mot de passe). Contrairement au
  // businessLogin de démonstration (sans identifiant, fermé pour RGPD), ce compte
  // est nominatif et sécurisé → chaque recruteur gère SON propre espace/vivier.
  businessRegister: async (req: Request, res: Response) => {
    try {
      const { email: rawEmail, password, name, companyName, acceptedTerms } = req.body;

      if (!rawEmail || !password || !name || !companyName) {
        return res.status(400).json({ success: false, error: "Nom, société, email et mot de passe sont requis." });
      }
      if (!isValidEmail(rawEmail)) {
        return res.status(400).json({ success: false, error: "Cette adresse email n'est pas valide. Vérifiez le domaine (ex. nom@organisme.fr)." });
      }
      const email = normalizeEmail(rawEmail);
      if (!acceptedTerms) {
        return res.status(400).json({ success: false, error: "Vous devez accepter les CGU et la politique de confidentialité." });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères." });
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ success: false, error: "Cet email est déjà utilisé." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Organisation (entité recruteur) créée en même temps que le compte.
      const organization = await prisma.organization.create({ data: { name: companyName } });

      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'BUSINESS_PARTNER',
          plan: 'Essai',
          organizationId: organization.id,
          acceptedTermsAt: new Date(),
        },
      });

      const token = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.cookie('token', token, COOKIE_OPTIONS);

      const { password: _pw, ...userWithoutPassword } = user;
      res.status(201).json({ success: true, user: userWithoutPassword, token });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de la création du compte recruteur." });
    }
  },

  businessLogin: async (req: Request, res: Response) => {
    try {
      // 🔒 VERROU DE SÉCURITÉ ACTIF (refermé 2026-06-12 avant lancement pub / vrais candidats).
      // RGPD art. 32 : l'accès partenaire SANS identifiant donnerait accès aux données
      // personnelles des candidats. Bloqué par défaut ; n'autorisé qu'en démo locale
      // via ENABLE_DEMO_BUSINESS_LOGIN=true (à NE JAMAIS mettre en prod Render).
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
      // token renvoyé aussi dans le body : fallback header Bearer pour les mobiles
      // où le cookie tiers (SameSite=None) est bloqué.
      res.json({ success: true, user: userWithoutPassword, token });
    } catch (error: any) {
      console.error('Business login error:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || "Erreur lors de la connexion partenaire." });
    }
  },

  logout: (req: Request, res: Response) => {
    // clearCookie doit reprendre les mêmes attributs que res.cookie (hors maxAge) :
    // en prod le cookie est SameSite=None/Secure (cross-site front↔back) et le
    // navigateur rejette une suppression qui n'a pas ces attributs — la session
    // survivrait à la déconnexion et reconnecterait l'utilisateur au prochain accès.
    const { maxAge: _ignored, ...clearOptions } = COOKIE_OPTIONS;
    res.clearCookie('token', clearOptions);
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
