import { Request, Response } from 'express';
import { prisma } from '../db';
import { franceTravailService, isFranceTravailConfigured, FtOffer } from '../services/francetravail.service';
import { adzunaService, isAdzunaConfigured } from '../services/adzuna.service';

// Déduplique des offres venant de plusieurs sources (clé = titre + entreprise normalisés).
const dedupeOffers = (offers: FtOffer[]): FtOffer[] => {
  const seen = new Set<string>();
  const out: FtOffer[] = [];
  for (const o of offers) {
    const key = `${(o.title || '').toLowerCase().trim()}|${(o.company || '').toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
};

// Libellé relatif FR pour la date de publication d'une offre partenaire.
const relativeLabel = (d?: Date | null): string => {
  if (!d) return 'Récemment';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
};

// Offres publiées par les organismes auxquels le candidat est AFFILIÉ (espace recruteur).
// Elles apparaissent en tête du flux, clairement attribuées à l'organisme (nom + logo).
const getPartnerOffers = async (user: any, q: string, contractType?: string): Promise<any[]> => {
  const affiliations = await prisma.businessAffiliation.findMany({
    where: { jobseekerId: user.id },
    select: { businessId: true },
  });
  if (affiliations.length === 0) return [];

  const now = new Date();
  const offers = await prisma.businessOffer.findMany({
    where: {
      businessId: { in: affiliations.map((a) => a.businessId) },
      isPublished: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    include: { business: { include: { organization: true } } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });

  const qNorm = q.toLowerCase();
  const userSkills = new Set(
    (Array.isArray(user.skills) ? user.skills : [])
      .map((s: any) => String(typeof s === 'string' ? s : s?.name || '').trim().toLowerCase())
      .filter(Boolean),
  );

  return offers
    // Respecte la recherche libre et le filtre contrat pour ne pas polluer les résultats.
    .filter((o) => !qNorm || `${o.title} ${o.description}`.toLowerCase().includes(qNorm))
    .filter((o) => !contractType || (o.contractType || '').toUpperCase() === contractType)
    .map((o) => {
      const org = o.business?.organization;
      const required = (o.requiredSkills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
      const matched = required.filter((s) => userSkills.has(s));
      // Score heuristique (même esprit que FT/Adzuna) : socle élevé — l'organisme
      // s'adresse à ses propres adhérents — affiné par le recoupement de compétences.
      const matchScore = required.length > 0
        ? 50 + Math.round((matched.length / required.length) * 50)
        : 70;
      return {
        id: `partner-${o.id}`,
        title: o.title,
        company: org?.name || 'Votre organisme',
        location: o.location || '',
        salary: o.salaryRange || '',
        type: o.contractType || '',
        matchScore,
        postedDate: relativeLabel(o.publishedAt || o.createdAt),
        source: 'Partenaire',
        url: '',
        tags: o.requiredSkills || [],
        aiInsight: o.description,
        partner: { name: org?.name || 'Votre organisme', logoUrl: org?.logoUrl || null },
      };
    });
};

export const opportunityController = {
  // Recommandations : vraies offres France Travail + Adzuna sourcées sur le profil
  // (ou sur une recherche libre), avec repli sur des exemples simulés si aucune source
  // n'est configurée / disponible.
  getRecommendations: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });

      // Mot-clé : recherche libre saisie par l'utilisateur, sinon intitulé du profil.
      const q = (req.query.q as string || '').trim();
      const title = q || user.title || 'Développeur';
      const city = user.city || 'Paris';
      // Localisation précise = ville + code postal du profil (évite de filtrer tout un département).
      const location = [user.city, (user as any).postalCode].filter(Boolean).join(' ').trim() || city;
      // Rayon de recherche en km (paramétrable depuis l'UI ; défaut 30).
      const distance = Math.min(150, Math.max(5, parseInt(req.query.distance as string) || 30));
      // Filtre type de contrat (CDI / CDD / MIS / SAI). Vide = tous.
      const allowedContracts = ['CDI', 'CDD', 'MIS', 'SAI'];
      const contractType = allowedContracts.includes(req.query.contractType as string)
        ? (req.query.contractType as string)
        : undefined;

      // 0. Offres des organismes partenaires du candidat (toujours en tête de flux).
      const partnerOffers = await getPartnerOffers(user, q, contractType)
        .catch((e: any) => { console.error('Offres partenaires indisponibles :', e?.message || e); return [] as any[]; });

      // 1. Vraies offres : France Travail + Adzuna interrogés en parallèle (chacun protégé).
      const sources: Promise<FtOffer[]>[] = [];
      if (isFranceTravailConfigured()) {
        sources.push(
          franceTravailService.searchOffers(title, location, 100, distance, contractType)
            .catch((e: any) => { console.error('France Travail indisponible (offres) :', e?.message || e); return [] as FtOffer[]; })
        );
      }
      if (isAdzunaConfigured()) {
        sources.push(
          adzunaService.searchOffers(title, location, 50, distance, contractType)
            .catch((e: any) => { console.error('Adzuna indisponible (offres) :', e?.message || e); return [] as FtOffer[]; })
        );
      }

      if (sources.length > 0) {
        const settled = await Promise.all(sources);
        const merged = dedupeOffers(settled.flat()).sort((a, b) => b.matchScore - a.matchScore);
        if (merged.length > 0 || partnerOffers.length > 0) {
          const usedSources = Array.from(new Set(merged.map((o) => o.source)));
          return res.json({
            success: true,
            source: usedSources.length > 1 ? 'mixed' : (usedSources[0] === 'Adzuna' ? 'adzuna' : 'francetravail'),
            sources: partnerOffers.length > 0 ? ['Partenaire', ...usedSources] : usedSources,
            // Les offres de l'organisme du candidat passent devant les offres externes.
            recommendations: [...partnerOffers, ...merged].slice(0, 150),
          });
        }
        // Des sources réelles SONT configurées mais ne renvoient rien → vrai « aucun résultat ».
        // On NE retombe PAS sur des exemples fictifs (ce serait trompeur, surtout sur une recherche
        // explicite). Le front affiche alors son état vide.
        const realLabel = (isAdzunaConfigured() && !isFranceTravailConfigured()) ? 'adzuna' : 'francetravail';
        return res.json({ success: true, source: realLabel, recommendations: [] });
      }

      // 2. Repli : exemples simulés UNIQUEMENT si aucune source réelle n'est configurée.
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

      res.json({ success: true, source: 'demo', recommendations: [...partnerOffers, ...simulatedRecommendations] });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur récupération recommandations" });
    }
  },

  // Offres des organismes partenaires du candidat, sans les sources externes
  // (endpoint léger pour l'Accueil : pas d'appel France Travail / Adzuna).
  getPartnerOffers: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
      const offers = await getPartnerOffers(user, '', undefined);
      res.json({ success: true, offers });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur récupération offres partenaires" });
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
