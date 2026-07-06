import { Request, Response } from 'express';
import { prisma } from '../db';

export const dashboardController = {
  getStats: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      // Complétion du profil : mêmes 18 champs que la jauge du front (Profile.tsx),
      // chacun avec un libellé lisible → on renvoie aussi LA LISTE de ce qui manque,
      // pour que l'UI puisse dire QUOI compléter au lieu d'un pourcentage muet.
      const isFilled = (f: any): boolean => {
         if (Array.isArray(f)) return f.length > 0;
         if (typeof f === 'string') return f.trim().length > 0;
         return !!f;
      };
      const fieldsToCheck: [any, string][] = [
        [user.name, 'ton nom'], [user.email, 'ton email'], [user.title, 'ton métier cible'],
        [user.summary, 'ton résumé'], [user.city, 'ta ville'], [user.phone, 'ton téléphone'],
        [user.skills, 'tes compétences'], [user.experiences, 'tes expériences'], [user.education, 'ta formation'],
        [user.languages, 'tes langues'], [user.languagesDetailed, 'tes langues'],
        [user.softSkills, 'tes qualités'], [user.targetSectors, 'tes secteurs visés'],
        [user.contractTypes, 'tes types de contrat'], [user.mobility, 'ta mobilité'],
        [user.drivingLicenses, 'tes permis'], [user.portfolio, 'ton portfolio'], [user.github, 'ton GitHub'],
      ];
      const filledCount = fieldsToCheck.filter(([f]) => isFilled(f)).length;
      const profileCompletion = Math.round((filledCount / fieldsToCheck.length) * 100);
      // Libellés dédupliqués (languages / languagesDetailed partagent « tes langues »).
      const profileMissing = [...new Set(fieldsToCheck.filter(([f]) => !isFilled(f)).map(([, label]) => label))];

      // Counts Prisma
      const cvCount = await prisma.cV.count({ where: { userId: user.id } });
      const letterCount = await prisma.coverLetter.count({ where: { userId: user.id } });
      const savedCount = await prisma.savedOpportunity.count({ where: { userId: user.id } });
      
      const apps = await prisma.application.findMany({ where: { userId: user.id } });
      
      const applicationStats = {
        total: apps.length,
        pending: apps.filter((a: any) => a.status === 'PENDING').length,
        sent: apps.filter((a: any) => a.status === 'SENT').length,
        interview: apps.filter((a: any) => a.status === 'INTERVIEW').length,
        offer: apps.filter((a: any) => a.status === 'OFFER').length,
        rejected: apps.filter((a: any) => a.status === 'REJECTED').length,
      };

      res.json({
        success: true,
        stats: {
          profileCompletion,
          profileMissing,
          cvCount,
          letterCount,
          savedCount,
          recommendedCount: 3, // MVP valeur dérivée fixe générée dynamiquement au fetch
          applications: applicationStats
        }
      });
    } catch (error: any) {
      console.error("Dashboard Stats Error:", error);
      res.status(500).json({ success: false, error: "Erreur lors du calcul des statistiques Dashboard" });
    }
  }
};
