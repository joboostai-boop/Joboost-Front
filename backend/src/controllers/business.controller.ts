import { Request, Response } from 'express';
import { prisma } from '../db';

export const businessController = {

  // ==================== OFFERS ====================

  createOffer: async (req: Request, res: Response) => {
    try {
      const { title, description, contractType, location, salaryRange, requiredSkills, expiresAt } = req.body;

      if (!title || !description) {
        return res.status(400).json({ success: false, error: 'Le titre et la description sont requis.' });
      }

      const offer = await prisma.businessOffer.create({
        data: {
          businessId: req.userId!,
          title,
          description,
          contractType: contractType || null,
          location: location || null,
          salaryRange: salaryRange || null,
          requiredSkills: requiredSkills || [],
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      res.status(201).json({ success: true, offer });
    } catch (error: any) {
      console.error('Business createOffer error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de la création de l'offre." });
    }
  },

  listOffers: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [offers, total] = await Promise.all([
        prisma.businessOffer.findMany({
          where: { businessId: req.userId! },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.businessOffer.count({ where: { businessId: req.userId! } }),
      ]);

      res.json({
        success: true,
        offers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Business listOffers error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des offres.' });
    }
  },

  updateOffer: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, contractType, location, salaryRange, requiredSkills, expiresAt } = req.body;

      // Vérifier que l'offre appartient au business_partner
      const existing = await prisma.businessOffer.findFirst({
        where: { id, businessId: req.userId! },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Offre non trouvée.' });
      }

      const offer = await prisma.businessOffer.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(contractType !== undefined && { contractType }),
          ...(location !== undefined && { location }),
          ...(salaryRange !== undefined && { salaryRange }),
          ...(requiredSkills !== undefined && { requiredSkills }),
          ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        },
      });

      res.json({ success: true, offer });
    } catch (error: any) {
      console.error('Business updateOffer error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de la modification de l'offre." });
    }
  },

  deleteOffer: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.businessOffer.findFirst({
        where: { id, businessId: req.userId! },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Offre non trouvée.' });
      }

      await prisma.businessOffer.delete({ where: { id } });
      res.json({ success: true, message: 'Offre supprimée.' });
    } catch (error: any) {
      console.error('Business deleteOffer error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de la suppression de l'offre." });
    }
  },

  togglePublish: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.businessOffer.findFirst({
        where: { id, businessId: req.userId! },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Offre non trouvée.' });
      }

      const newPublished = !existing.isPublished;
      const offer = await prisma.businessOffer.update({
        where: { id },
        data: {
          isPublished: newPublished,
          publishedAt: newPublished ? new Date() : null,
        },
      });

      res.json({ success: true, offer });
    } catch (error: any) {
      console.error('Business togglePublish error:', error);
      res.status(500).json({ success: false, error: "Erreur lors du changement de statut." });
    }
  },

  // ==================== JOBSEEKERS ====================

  listJobseekers: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const status = (req.query.status as string) || undefined;
      const search = (req.query.search as string) || undefined;

      // Build affiliation filter
      const affiliationWhere: any = { businessId: req.userId! };
      if (status) affiliationWhere.status = status;

      // Build jobseeker search filter
      const jobseekerWhere: any = {};
      if (search) {
        jobseekerWhere.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { skills: { hasSome: [search] } },
        ];
      }

      const [affiliations, total] = await Promise.all([
        prisma.businessAffiliation.findMany({
          where: {
            ...affiliationWhere,
            jobseeker: jobseekerWhere,
          },
          include: {
            jobseeker: {
              select: {
                id: true,
                name: true,
                email: true,
                title: true,
                skills: true,
                city: true,
                phone: true,
                updatedAt: true,
                experiences: true,
                education: true,
                summary: true,
                linkedin: true,
              },
            },
          },
          orderBy: { affiliatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.businessAffiliation.count({
          where: {
            ...affiliationWhere,
            jobseeker: jobseekerWhere,
          },
        }),
      ]);

      const jobseekers = affiliations.map((a) => ({
        affiliationId: a.id,
        affiliationStatus: a.status,
        affiliatedAt: a.affiliatedAt,
        ...a.jobseeker,
      }));

      res.json({
        success: true,
        jobseekers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Business listJobseekers error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des demandeurs.' });
    }
  },

  getJobseekerDetail: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Vérifier l'affiliation
      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId: req.userId!, jobseekerId: id },
      });

      if (!affiliation) {
        return res.status(403).json({ success: false, error: 'Ce demandeur n\'est pas affilié à votre organisme.' });
      }

      const jobseeker = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          summary: true,
          skills: true,
          languages: true,
          city: true,
          phone: true,
          linkedin: true,
          portfolio: true,
          github: true,
          experiences: true,
          education: true,
          updatedAt: true,
          applications: {
            orderBy: { appliedAt: 'desc' },
            take: 10,
          },
          cvs: {
            orderBy: { updatedAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!jobseeker) {
        return res.status(404).json({ success: false, error: 'Demandeur non trouvé.' });
      }

      res.json({
        success: true,
        jobseeker: {
          ...jobseeker,
          affiliationStatus: affiliation.status,
          affiliatedAt: affiliation.affiliatedAt,
        },
      });
    } catch (error: any) {
      console.error('Business getJobseekerDetail error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération du profil.' });
    }
  },

  // ==================== STATS ====================

  getStats: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;

      // Total adhérents actifs
      const totalActive = await prisma.businessAffiliation.count({
        where: { businessId, status: 'active' },
      });

      // Nouveaux adhérents ce mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newThisMonth = await prisma.businessAffiliation.count({
        where: {
          businessId,
          affiliatedAt: { gte: startOfMonth },
        },
      });

      // Taux de complétion de profil moyen
      const affiliatedUsers = await prisma.businessAffiliation.findMany({
        where: { businessId },
        include: {
          jobseeker: {
            select: {
              name: true, email: true, title: true, summary: true, city: true,
              phone: true, skills: true, experiences: true, languages: true,
              portfolio: true, github: true,
            },
          },
        },
      });

      let totalCompletion = 0;
      affiliatedUsers.forEach((a) => {
        const u = a.jobseeker;
        const fields = [
          u.name, u.email, u.title, u.summary, u.city, u.phone,
          u.skills, u.experiences, u.languages, u.portfolio, u.github,
        ];
        const filled = fields.filter((f) => {
          if (Array.isArray(f)) return f.length > 0;
          if (typeof f === 'string') return f.trim().length > 0;
          return !!f;
        });
        totalCompletion += Math.round((filled.length / fields.length) * 100);
      });

      const avgProfileCompletion = affiliatedUsers.length > 0
        ? Math.round(totalCompletion / affiliatedUsers.length)
        : 0;

      // Candidatures des adhérents (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const affiliatedIds = affiliatedUsers.map((a) => a.jobseekerId);

      const applicationCount = affiliatedIds.length > 0
        ? await prisma.application.count({
            where: {
              userId: { in: affiliatedIds },
              appliedAt: { gte: thirtyDaysAgo },
            },
          })
        : 0;

      // Répartition par statut d'adhérent (donut)
      const statusDistribution = await prisma.businessAffiliation.groupBy({
        by: ['status'],
        where: { businessId },
        _count: { _all: true },
      });

      const statusBreakdown = statusDistribution.map((s) => ({
        status: s.status,
        count: s._count._all,
      }));

      // Évolution des affiliations sur 6 mois (line chart)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentAffiliations = await prisma.businessAffiliation.findMany({
        where: {
          businessId,
          affiliatedAt: { gte: sixMonthsAgo },
        },
        select: { affiliatedAt: true },
        orderBy: { affiliatedAt: 'asc' },
      });

      // Group by month
      const monthlyGrowth: { month: string; total: number }[] = [];
      const monthMap = new Map<string, number>();

      recentAffiliations.forEach((a) => {
        const key = `${a.affiliatedAt.getFullYear()}-${String(a.affiliatedAt.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(key, (monthMap.get(key) || 0) + 1);
      });

      // Fill in missing months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyGrowth.push({
          month: key,
          total: monthMap.get(key) || 0,
        });
      }

      // Top compétences parmi les adhérents
      const skillsMap = new Map<string, number>();
      affiliatedUsers.forEach((a) => {
        const skills = a.jobseeker.skills || [];
        skills.forEach((skill: string) => {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        });
      });

      const topSkills = Array.from(skillsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      // Offres publiées
      const publishedOffers = await prisma.businessOffer.count({
        where: { businessId, isPublished: true },
      });

      const totalOffers = await prisma.businessOffer.count({
        where: { businessId },
      });

      res.json({
        success: true,
        stats: {
          totalActive,
          newThisMonth,
          avgProfileCompletion,
          applicationCount,
          statusBreakdown,
          monthlyGrowth,
          topSkills,
          publishedOffers,
          totalOffers,
        },
      });
    } catch (error: any) {
      console.error('Business getStats error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du calcul des statistiques.' });
    }
  },
};
