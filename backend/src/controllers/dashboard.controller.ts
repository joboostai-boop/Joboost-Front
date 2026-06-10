import { Request, Response } from 'express';
import { prisma } from '../db';

export const dashboardController = {
  getStats: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      // Cacul Complétion du profil
      const fieldsToCheck = [
        user.name, user.email, user.title, user.summary, user.city, user.phone,
        user.skills, user.experiences, user.education, user.languages, user.languagesDetailed,
        user.softSkills, user.targetSectors, user.contractTypes, user.mobility,
        user.drivingLicenses, user.portfolio, user.github
      ];
      const filledFields = fieldsToCheck.filter(f => {
         if (Array.isArray(f)) return f.length > 0;
         if (typeof f === 'string') return f.trim().length > 0;
         return !!f;
      });
      const profileCompletion = Math.round((filledFields.length / fieldsToCheck.length) * 100);

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
