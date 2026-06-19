import { Request, Response } from 'express';
import { prisma } from '../db';
import { franceTravailService, isFranceTravailConfigured } from '../services/francetravail.service';

export const opportunityController = {
  // Recommandations : vraies offres France Travail sourcées sur le profil,
  // avec repli sur des exemples simulés si FT n'est pas configuré / indisponible.
  getRecommendations: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const title = user.title || 'Développeur';
      const city = user.city || 'Paris';
      // Localisation précise = ville + code postal du profil (évite de filtrer tout un département).
      const location = [user.city, (user as any).postalCode].filter(Boolean).join(' ').trim() || city;
      // Rayon de recherche en km (paramétrable depuis l'UI ; défaut 30).
      const distance = Math.min(150, Math.max(5, parseInt(req.query.distance as string) || 30));

      // 1. Vraies offres France Travail si les identifiants sont configurés.
      if (isFranceTravailConfigured()) {
        try {
          const real = await franceTravailService.searchOffers(title, location, 50, distance);
          if (real.length > 0) {
            return res.json({ success: true, source: 'francetravail', recommendations: real });
          }
        } catch (e: any) {
          console.error('France Travail indisponible (offres), repli sur la simulation :', e?.message || e);
        }
      }

      // 2. Repli : exemples simulés basés sur le profil.
      let skillsArray: string[] = [];
      if (Array.isArray(user.skills)) {
         skillsArray = user.skills.map((s: any) => typeof s === 'string' ? s : s.name || s.label || '');
      }
      
      const keySkill1 = skillsArray[0] || 'votre stack principale';
      const keySkill2 = skillsArray[1] || 'les technologies émergentes';

      const simulatedRecommendations = [
        {
          id: 'sim-1',
          title: `Senior ${title}`,
          company: 'TechVision France',
          location: city,
          salary: '55k€ - 70k€',
          type: 'CDI - Hybride',
          matchScore: 98,
          postedDate: 'Il y a 2h',
          source: 'LinkedIn',
          tags: [keySkill1, keySkill2, 'Management'],
          aiInsight: `Forte convergence détectée : Votre expertise en ${keySkill1} est exactement ce qu'ils recherchent dans l'équipe Core. Votre profil compense le besoin d'un candidat "Senior".`
        },
        {
          id: 'sim-2',
          title: `${title} (Remote)`,
          company: 'Innovate Remote Lab',
          location: 'Full Remote',
          salary: '60k€ - 85k€',
          type: 'CDI - Télétravail',
          matchScore: 89,
          postedDate: 'Hier',
          source: 'Welcome to the Jungle',
          tags: [keySkill1, 'Autonomie', 'English'],
          aiInsight: `Le rôle asynchrone correspond à votre niveau d'autonomie. L'offre requiert ${keySkill1}, ce qui est au cœur de votre profil.`
        },
        {
          id: 'sim-3',
          title: `Lead ${title}`,
          company: 'E-commerce Group',
          location: city,
          salary: '65k€ - 80k€',
          type: 'CDI - Présentiel',
          matchScore: 82,
          postedDate: 'Il y a 3 jours',
          source: 'France Travail',
          tags: ['Performance', keySkill2, "Refonte architecture"],
          aiInsight: `L'entreprise cherche activement à moderniser sa stack avec ${keySkill2}. C'est une opportunité pour s'affposer en Leader Technique.`
        }
      ];

      res.json({ success: true, source: 'demo', recommendations: simulatedRecommendations });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur récupération recommandations" });
    }
  },

  listSaved: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      // Pagination optionnelle : sans paramètre, on renvoie tout (comportement d'origine)
      const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [saved, total] = await Promise.all([
        (prisma as any).savedOpportunity.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          ...(hasPagination ? { skip, take: limit } : {})
        }),
        (prisma as any).savedOpportunity.count({ where: { userId: user.id } })
      ]);

      res.json({
        success: true,
        saved,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur récupération offres sauvegardées" });
    }
  },

  createSaved: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const { title, company, location, salary, type, matchScore, postedDate, source, url, tags, aiInsight } = req.body;
      const saved = await (prisma as any).savedOpportunity.create({
        data: {
          title: title || "Offre Inconnue",
          company: company || "Entreprise Inconnue",
          location: location || "",
          salary: salary || "",
          type: type || "",
          matchScore: matchScore || 0,
          postedDate: postedDate || "",
          source: source || "Manuel",
          url: url || "",
          tags: tags || [],
          aiInsight: aiInsight || "",
          userId: user.id
        }
      });
      res.json({ success: true, saved });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur sauvegarde de l'offre" });
    }
  },

  deleteSaved: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = await (prisma as any).savedOpportunity.findUnique({ where: { id } });
      if (!record || record.userId !== req.userId) {
        return res.status(404).json({ success: false, error: 'Offre introuvable.' });
      }
      await (prisma as any).savedOpportunity.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur suppression de l'offre" });
    }
  }
};
