import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { usageService } from '../services/usage.service';

export const userController = {
  // Solde de crédits + quota mensuel + abonnement courant (pour l'affichage du profil).
  getUsage: async (req: Request, res: Response) => {
    try {
      const usage = await usageService.getUsage(req.userId!);
      if (!usage) {
        return res.status(404).json({ success: false, error: "Utilisateur non trouvé." });
      }
      res.json({ success: true, usage });
    } catch (error: any) {
      console.error('getUsage error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de la récupération de l'usage." });
    }
  },

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

      // ─── Profil étendu (CV complet) ───
      if (req.body.firstName !== undefined) mappedData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) mappedData.lastName = req.body.lastName;
      // Si prénom/nom fournis, on (re)compose le champ name (requis, non-null).
      if (req.body.firstName !== undefined || req.body.lastName !== undefined) {
        const composed = `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim();
        if (composed) mappedData.name = composed;
      }
      if (req.body.postalCode !== undefined) mappedData.postalCode = req.body.postalCode;
      if (req.body.workTime !== undefined) mappedData.workTime = req.body.workTime;
      if (req.body.availability !== undefined) mappedData.availability = req.body.availability;
      if (req.body.salaryMin !== undefined) mappedData.salaryMin = req.body.salaryMin === null ? null : Number(req.body.salaryMin);
      if (req.body.salaryMax !== undefined) mappedData.salaryMax = req.body.salaryMax === null ? null : Number(req.body.salaryMax);
      if (req.body.ownVehicle !== undefined) mappedData.ownVehicle = req.body.ownVehicle;

      // Alertes emploi par email (opt-in + fréquence)
      if (req.body.jobAlertOptIn !== undefined) mappedData.jobAlertOptIn = Boolean(req.body.jobAlertOptIn);
      if (req.body.jobAlertFrequency !== undefined) {
        mappedData.jobAlertFrequency = req.body.jobAlertFrequency === 'weekly' ? 'weekly' : 'daily';
      }

      // Tableaux de chaînes (sélecteurs / cases à cocher)
      const arrayFields = ['targetSectors', 'targetLocations', 'contractTypes', 'softSkills', 'mobility', 'drivingLicenses', 'workSchedules'];
      for (const f of arrayFields) {
        if (req.body[f] !== undefined) {
          mappedData[f] = Array.isArray(req.body[f])
            ? req.body[f]
            : String(req.body[f]).split(',').map((x: string) => x.trim()).filter(Boolean);
        }
      }

      // Champs JSON structurés
      if (req.body.languagesDetailed !== undefined) mappedData.languagesDetailed = req.body.languagesDetailed;
      if (req.body.projects !== undefined) mappedData.projects = req.body.projects;

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
  },

  // Changement / définition du mot de passe (sécurité du compte).
  changePassword: async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ success: false, error: "Le nouveau mot de passe doit faire au moins 6 caractères." });
      }
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé." });

      // Si un mot de passe existe déjà (compte email), on exige et vérifie l'actuel.
      // Pour un compte OAuth sans mot de passe, on autorise la définition initiale.
      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: "Mot de passe actuel requis." });
        }
        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) {
          return res.status(401).json({ success: false, error: "Mot de passe actuel incorrect." });
        }
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      res.json({ success: true, message: "Mot de passe mis à jour.", hadPassword: !!user.password });
    } catch (error: any) {
      console.error('changePassword error:', error);
      res.status(500).json({ success: false, error: "Erreur lors du changement de mot de passe." });
    }
  }
};
