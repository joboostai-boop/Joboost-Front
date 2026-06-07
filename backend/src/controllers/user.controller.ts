import { Request, Response } from 'express';
import { prisma } from '../db';

export const userController = {
  // Mode strict temporaire: On ramène toujours l'unique premier utilisateur créé en base
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) {
        return res.status(404).json({ success: false, error: "Aucun utilisateur en base. Lancez le script de seed." });
      }
      res.json({ success: true, user: (() => { const { password: _, ...safeUser } = user as any; return safeUser; })() });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de la récupération de l'utilisateur." });
    }
  },

  updateCurrentUser: async (req: Request, res: Response) => {
    try {
      let user = await prisma.user.findUnique({ where: { id: req.userId! } });
      
      // Adaptation des données frontend vers le format du schéma Prisma
      const mappedData: any = {};
      if (req.body.name !== undefined) mappedData.name = req.body.name;
      if (req.body.email !== undefined) mappedData.email = req.body.email;
      if (req.body.phone !== undefined) mappedData.phone = req.body.phone;
      if (req.body.title !== undefined) mappedData.title = req.body.title;
      if (req.body.summary !== undefined) mappedData.summary = req.body.summary;
      if (req.body.linkedin !== undefined) mappedData.linkedin = req.body.linkedin;
      if (req.body.portfolio !== undefined) mappedData.portfolio = req.body.portfolio;
      if (req.body.github !== undefined) mappedData.github = req.body.github;
      if (req.body.city !== undefined) mappedData.city = req.body.city;
      
      if (typeof req.body.skills === 'string') {
        mappedData.skills = req.body.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (Array.isArray(req.body.skills)) {
        mappedData.skills = req.body.skills;
      }
      
      if (typeof req.body.languages === 'string') {
        mappedData.languages = req.body.languages.split(',').map((l: string) => l.trim()).filter(Boolean);
      } else if (Array.isArray(req.body.languages)) {
        mappedData.languages = req.body.languages;
      }

      if (typeof req.body.hobbies === 'string') {
        mappedData.hobbies = req.body.hobbies.split(',').map((h: string) => h.trim()).filter(Boolean);
      } else if (Array.isArray(req.body.hobbies)) {
        mappedData.hobbies = req.body.hobbies;
      }
      
      if (req.body.experiences !== undefined) {
        mappedData.experiences = req.body.experiences;
      }

      if (req.body.education !== undefined) {
        mappedData.education = req.body.education;
      }
      
      if (!user) {
         // Create the user if it doesn't exist
         user = await prisma.user.create({
            data: {
              email: mappedData.email || 'new@joboost.ai',
              name: mappedData.name || 'Nouveau',
              ...mappedData
            }
         });
         return res.json({ success: true, user });
      }

      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: mappedData
      });
      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de la mise à jour : " + error.message });
    }
  },

  // RGPD — Droit d'accès / portabilité (art. 15 & 20) : export complet des données.
  exportData: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        include: {
          applications: true,
          cvs: true,
          coverLetters: true,
          savedOpportunities: true,
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Utilisateur non trouvé." });
      }

      // On retire les données sensibles/techniques non personnelles
      const {
        password: _pw,
        ftAccessToken: _at,
        ftRefreshToken: _rt,
        ...safeUser
      } = user as any;

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        notice: "Export de vos données personnelles JoBoost (RGPD, art. 15 & 20).",
        data: safeUser,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="joboost-mes-donnees.json"`);
      res.status(200).send(JSON.stringify(exportPayload, null, 2));
    } catch (error: any) {
      console.error('exportData error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de l'export des données." });
    }
  },

  // RGPD — Droit à l'effacement (art. 17) : suppression définitive du compte.
  deleteAccount: async (req: Request, res: Response) => {
    try {
      const existing = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!existing) {
        return res.status(404).json({ success: false, error: "Utilisateur non trouvé." });
      }

      // Les relations (applications, cvs, lettres, opportunités, affiliations, offres)
      // sont supprimées en cascade (onDelete: Cascade dans le schéma Prisma).
      await prisma.user.delete({ where: { id: req.userId! } });

      res.clearCookie('token');
      res.json({ success: true, message: "Votre compte et vos données ont été supprimés définitivement." });
    } catch (error: any) {
      console.error('deleteAccount error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de la suppression du compte." });
    }
  }
};
