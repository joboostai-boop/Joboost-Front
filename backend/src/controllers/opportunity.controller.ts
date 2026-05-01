import { Request, Response } from 'express';
import { prisma } from '../db';

export const opportunityController = {
  // Simule des recommandations intelligentes basées sur le vrai profil de l'utilisateur
  getRecommendations: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const title = user.title || 'Développeur';
      const city = user.city || 'Paris';
      
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

      res.json({ success: true, recommendations: simulatedRecommendations });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur récupération recommandations" });
    }
  },

  listSaved: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      const saved = await (prisma as any).savedOpportunity.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, saved });
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
