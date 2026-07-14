import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../db';
import { geminiService } from '../services/gemini.service';
import { stripeService, BUSINESS_PLANS } from '../services/stripe.service';
import { emailService } from '../services/email.service';

// Modèle SUR DEVIS (espace recruteur UNIQUEMENT — le côté candidat a son propre modèle).
// Période de découverte de 15 JOURS à partir de la création du compte : accès complet
// (IA + vivier plafonné à 100). Passé ce délai sans abonnement (plan 'Essai'), l'IA et
// l'ajout de candidats se bloquent → l'organisme doit demander un devis. Un plan
// « Business … » (posé après signature) ou « Pro » (legacy) = illimité, sans expiration.
const DISCOVERY_DAYS = 15;
const DISCOVERY_VIVIER_LIMIT = 100;

const isPaidBusinessPlan = (plan: string): boolean => plan === 'Pro' || plan.startsWith('Business');

// Jours de découverte restants (0 = expirée), basés sur la date de création du compte.
const discoveryDaysLeft = (user: { createdAt: Date }): number => {
  const elapsedDays = (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(DISCOVERY_DAYS - elapsedDays));
};
const discoveryActive = (user: { createdAt: Date }): boolean => discoveryDaysLeft(user) > 0;

// Accès complet = abonné payant OU découverte encore active.
const hasFullAccess = (user: { plan: string; createdAt: Date }): boolean =>
  isPaidBusinessPlan(user.plan) || discoveryActive(user);
const aiEnabledFor = (user: { plan: string; createdAt: Date }): boolean => hasFullAccess(user);
const vivierLimitFor = (user: { plan: string; createdAt: Date }): number =>
  isPaidBusinessPlan(user.plan) ? Number.POSITIVE_INFINITY
    : discoveryActive(user) ? DISCOVERY_VIVIER_LIMIT
    : 0;

export const businessController = {

  // ==================== COMPTE / ENTREPRISE ====================

  // Renvoie les infos du compte recruteur + son organisation (entité).
  getAccount: async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        include: { organization: true },
      });
      if (!user) return res.status(404).json({ success: false, error: 'Compte introuvable.' });
      res.json({
        success: true,
        account: {
          name: user.name,
          email: user.email,
          plan: user.plan,
          companyName: user.organization?.name || '',
          logoUrl: user.organization?.logoUrl || null,
          subscriptionStatus: user.subscriptionStatus || null,
          subscriptionEndsAt: user.subscriptionEndsAt || null,
          isPaid: isPaidBusinessPlan(user.plan),
          discoveryDaysLeft: discoveryDaysLeft(user),
          discoveryActive: discoveryActive(user),
        },
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement du compte.' });
    }
  },

  // Met à jour le nom du recruteur, le nom de l'entreprise et son logo
  // (crée l'organisation si absente).
  updateAccount: async (req: Request, res: Response) => {
    try {
      const { name, companyName, logoUrl } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: 'Compte introuvable.' });

      if (typeof name === 'string' && name.trim()) {
        await prisma.user.update({ where: { id: user.id }, data: { name: name.trim() } });
      }

      // Validation du logo : data URL image, taille bornée (stockée en base).
      if (logoUrl !== undefined && logoUrl !== null) {
        if (typeof logoUrl !== 'string' || !logoUrl.startsWith('data:image/') || logoUrl.length > 500_000) {
          return res.status(400).json({ success: false, error: 'Logo invalide ou trop lourd (500 Ko max).' });
        }
      }

      const orgData: any = {};
      if (typeof companyName === 'string' && companyName.trim()) orgData.name = companyName.trim();
      if (logoUrl !== undefined) orgData.logoUrl = logoUrl; // null = retirer le logo

      if (Object.keys(orgData).length > 0) {
        if (user.organizationId) {
          await prisma.organization.update({ where: { id: user.organizationId }, data: orgData });
        } else {
          const org = await prisma.organization.create({
            data: { name: orgData.name || 'Mon entreprise', logoUrl: orgData.logoUrl ?? null },
          });
          await prisma.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
        }
      }

      const updated = await prisma.user.findUnique({ where: { id: user.id }, include: { organization: true } });
      res.json({
        success: true,
        account: {
          name: updated?.name,
          email: updated?.email,
          plan: updated?.plan,
          companyName: updated?.organization?.name || '',
          logoUrl: updated?.organization?.logoUrl || null,
          subscriptionStatus: updated?.subscriptionStatus || null,
          subscriptionEndsAt: updated?.subscriptionEndsAt || null,
          isPaid: updated ? isPaidBusinessPlan(updated.plan) : false,
          discoveryDaysLeft: updated ? discoveryDaysLeft(updated) : 0,
          discoveryActive: updated ? discoveryActive(updated) : false,
        },
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du compte.' });
    }
  },

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
      const search = (req.query.search as string) || undefined;
      const status = (req.query.status as string) || undefined; // 'published' | 'draft'

      const where: any = { businessId: req.userId! };
      if (search) where.title = { contains: search, mode: 'insensitive' };
      if (status === 'published') where.isPublished = true;
      if (status === 'draft') where.isPublished = false;

      const [offers, total] = await Promise.all([
        prisma.businessOffer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.businessOffer.count({ where }),
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

  // Matching : candidats du vivier dont les compétences recoupent celles requises par l'offre.
  getOfferMatches: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const offer = await prisma.businessOffer.findFirst({
        where: { id, businessId: req.userId! },
      });
      if (!offer) {
        return res.status(404).json({ success: false, error: 'Offre non trouvée.' });
      }

      const required = (offer.requiredSkills || [])
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      // Pas de compétences requises → matching impossible (on le signale honnêtement).
      if (required.length === 0) {
        return res.json({ success: true, matches: [], requiredSkills: [], totalVivier: 0 });
      }

      const affiliations = await prisma.businessAffiliation.findMany({
        where: { businessId: req.userId! },
        include: {
          jobseeker: {
            select: { id: true, name: true, email: true, title: true, city: true, skills: true },
          },
        },
      });

      const requiredSet = new Set(required);

      const matches = affiliations
        .map((a) => {
          const skills = a.jobseeker.skills || [];
          const matchedSkills = skills.filter((s) => requiredSet.has(s.trim().toLowerCase()));
          return {
            id: a.jobseeker.id,
            name: a.jobseeker.name,
            title: a.jobseeker.title,
            city: a.jobseeker.city,
            skills,
            affiliationStatus: a.status,
            matchCount: matchedSkills.length,
            matchedSkills,
            matchPercent: Math.round((matchedSkills.length / requiredSet.size) * 100),
          };
        })
        .filter((m) => m.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount);

      res.json({
        success: true,
        matches,
        requiredSkills: offer.requiredSkills || [],
        totalVivier: affiliations.length,
      });
    } catch (error: any) {
      console.error('Business getOfferMatches error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du calcul des correspondances.' });
    }
  },

  // Positionne un candidat AFFILIÉ sur une offre de l'organisme : crée la candidature
  // sur le compte du candidat (visible dans son suivi ET dans son profil côté recruteur).
  applyCandidateToOffer: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { id } = req.params; // id de l'offre
      const { jobseekerId } = req.body || {};
      if (!jobseekerId) {
        return res.status(400).json({ success: false, error: 'Candidat manquant.' });
      }

      const offer = await prisma.businessOffer.findFirst({ where: { id, businessId } });
      if (!offer) return res.status(404).json({ success: false, error: 'Offre non trouvée.' });

      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId, jobseekerId: String(jobseekerId) },
      });
      if (!affiliation) {
        return res.status(403).json({ success: false, error: 'Ce candidat n\'est pas dans votre vivier.' });
      }

      const recruiter = await prisma.user.findUnique({
        where: { id: businessId },
        include: { organization: true },
      });
      const company = recruiter?.organization?.name || 'Organisme partenaire';

      const dup = await prisma.application.findFirst({
        where: { userId: String(jobseekerId), title: offer.title, company },
      });
      if (dup) {
        return res.status(409).json({ success: false, error: 'Ce candidat est déjà positionné sur cette offre.' });
      }

      const application = await prisma.application.create({
        data: {
          userId: String(jobseekerId),
          company,
          title: offer.title,
          source: 'Espace recruteur',
          status: 'SENT',
          notes: `Positionné par ${company} via l'espace recruteur Joboost.`,
        },
      });

      res.status(201).json({ success: true, application });
    } catch (error: any) {
      console.error('Business applyCandidateToOffer error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du positionnement du candidat.' });
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
          managedByBusinessId: true,
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

      const { managedByBusinessId, ...rest } = jobseeker;
      res.json({
        success: true,
        jobseeker: {
          ...rest,
          affiliationStatus: affiliation.status,
          affiliatedAt: affiliation.affiliatedAt,
          note: affiliation.note,
          managed: managedByBusinessId === req.userId!, // true = fiche éditable par ce recruteur
        },
      });
    } catch (error: any) {
      console.error('Business getJobseekerDetail error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération du profil.' });
    }
  },

  // Ajoute un candidat AU VIVIER du recruteur (saisie manuelle : l'entreprise gère sa propre base).
  // Crée un profil candidat « géré » (pas un compte connectable) puis l'affilie.
  createJobseeker: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { name, email, title, city, phone, summary, skills, linkedin } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: 'Le nom du candidat est requis.' });
      }

      // Découverte : vivier plafonné (100) pendant 15 j, puis bloqué. Business = illimité.
      const recruiter = await prisma.user.findUnique({ where: { id: businessId } });
      const limit = recruiter ? vivierLimitFor(recruiter) : DISCOVERY_VIVIER_LIMIT;
      const currentCount = await prisma.businessAffiliation.count({ where: { businessId } });
      if (currentCount >= limit) {
        const expired = recruiter && !isPaidBusinessPlan(recruiter.plan) && !discoveryActive(recruiter);
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT',
          error: expired
            ? `Votre période de découverte de ${DISCOVERY_DAYS} jours est terminée. Demandez votre devis (onglet Abonnement) pour continuer à ajouter des candidats.`
            : `Votre vivier a atteint la limite de la période de découverte (${DISCOVERY_VIVIER_LIMIT} candidats). Demandez votre devis dans l'onglet Abonnement pour passer en illimité.`,
        });
      }

      const cleanSkills = Array.isArray(skills)
        ? skills.map((s: string) => String(s).trim()).filter(Boolean)
        : [];

      // Email : si l'adresse correspond à un compte candidat Joboost existant, on RATTACHE
      // ce compte au vivier (affiliation) au lieu de refuser → l'adhérent verra les offres
      // de l'organisme dans son flux Joboost. Sans email, on synthétise une adresse interne.
      let finalEmail: string;
      const provided = email ? String(email).trim().toLowerCase() : '';
      if (provided) {
        const existing = await prisma.user.findUnique({ where: { email: provided } });
        if (existing) {
          if (existing.role !== 'CANDIDATE') {
            return res.status(409).json({ success: false, error: 'Cet e-mail correspond à un compte non candidat (recruteur/admin).' });
          }
          if (existing.managedByBusinessId && existing.managedByBusinessId !== businessId) {
            return res.status(409).json({ success: false, error: 'Ce profil appartient déjà au vivier d\'un autre organisme.' });
          }
          const already = await prisma.businessAffiliation.findFirst({
            where: { businessId, jobseekerId: existing.id },
          });
          if (already) {
            return res.status(409).json({ success: false, error: 'Ce candidat est déjà dans votre vivier.' });
          }
          const affiliation = await prisma.businessAffiliation.create({
            data: { businessId, jobseekerId: existing.id, status: 'active' },
          });
          return res.status(201).json({
            success: true,
            linkedExistingAccount: true, // le front peut préciser « compte Joboost rattaché »
            jobseeker: {
              affiliationId: affiliation.id,
              affiliationStatus: affiliation.status,
              affiliatedAt: affiliation.affiliatedAt,
              id: existing.id,
              name: existing.name,
              email: existing.email,
              title: existing.title,
              skills: existing.skills,
              city: existing.city,
              phone: existing.phone,
              updatedAt: existing.updatedAt,
            },
          });
        }
        finalEmail = provided;
      } else {
        finalEmail = `vivier-${randomUUID()}@candidat.joboost.local`;
      }

      const candidate = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: finalEmail,
          role: 'CANDIDATE',
          managedByBusinessId: businessId,
          title: title ? String(title).trim() : null,
          city: city ? String(city).trim() : null,
          phone: phone ? String(phone).trim() : null,
          summary: summary ? String(summary).trim() : null,
          linkedin: linkedin ? String(linkedin).trim() : null,
          skills: cleanSkills,
        },
      });

      const affiliation = await prisma.businessAffiliation.create({
        data: { businessId, jobseekerId: candidate.id, status: 'active' },
      });

      res.status(201).json({
        success: true,
        jobseeker: {
          affiliationId: affiliation.id,
          affiliationStatus: affiliation.status,
          affiliatedAt: affiliation.affiliatedAt,
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          title: candidate.title,
          skills: candidate.skills,
          city: candidate.city,
          phone: candidate.phone,
          updatedAt: candidate.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('Business createJobseeker error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de l'ajout du candidat." });
    }
  },

  // Édite la fiche d'un candidat — UNIQUEMENT s'il a été créé par ce recruteur (managed).
  // On ne modifie jamais le profil d'un vrai utilisateur Joboost.
  updateJobseeker: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { id } = req.params;

      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId, jobseekerId: id },
      });
      if (!affiliation) {
        return res.status(404).json({ success: false, error: 'Candidat non trouvé dans votre vivier.' });
      }

      const candidate = await prisma.user.findUnique({ where: { id } });
      if (!candidate || candidate.managedByBusinessId !== businessId) {
        return res.status(403).json({
          success: false,
          error: "Ce profil appartient à un utilisateur Joboost et ne peut pas être modifié ici.",
        });
      }

      const { name, email, title, city, phone, summary, skills, linkedin } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = String(name).trim();
      if (title !== undefined) data.title = title ? String(title).trim() : null;
      if (city !== undefined) data.city = city ? String(city).trim() : null;
      if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
      if (summary !== undefined) data.summary = summary ? String(summary).trim() : null;
      if (linkedin !== undefined) data.linkedin = linkedin ? String(linkedin).trim() : null;
      if (skills !== undefined) {
        data.skills = Array.isArray(skills) ? skills.map((s: string) => String(s).trim()).filter(Boolean) : [];
      }
      if (email !== undefined && String(email).trim()) {
        const provided = String(email).trim().toLowerCase();
        if (provided !== candidate.email) {
          const clash = await prisma.user.findUnique({ where: { email: provided } });
          if (clash) {
            return res.status(409).json({ success: false, error: 'Un profil avec cet e-mail existe déjà.' });
          }
          data.email = provided;
        }
      }

      const updated = await prisma.user.update({ where: { id }, data });
      res.json({
        success: true,
        jobseeker: {
          affiliationId: affiliation.id,
          affiliationStatus: affiliation.status,
          affiliatedAt: affiliation.affiliatedAt,
          id: updated.id,
          name: updated.name,
          email: updated.email,
          title: updated.title,
          skills: updated.skills,
          city: updated.city,
          phone: updated.phone,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('Business updateJobseeker error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la modification du candidat.' });
    }
  },

  // Change le statut d'affiliation (active / inactive / suspended).
  updateJobseekerStatus: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { id } = req.params;
      const { status } = req.body;

      const ALLOWED = ['active', 'inactive', 'suspended'];
      if (!ALLOWED.includes(status)) {
        return res.status(400).json({ success: false, error: 'Statut invalide.' });
      }

      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId, jobseekerId: id },
      });
      if (!affiliation) {
        return res.status(404).json({ success: false, error: 'Candidat non trouvé dans votre vivier.' });
      }

      await prisma.businessAffiliation.update({ where: { id: affiliation.id }, data: { status } });
      res.json({ success: true, status });
    } catch (error: any) {
      console.error('Business updateJobseekerStatus error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du changement de statut.' });
    }
  },

  // Enregistre la note privée du recruteur sur un candidat (mini-CRM).
  updateJobseekerNote: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { id } = req.params;
      const { note } = req.body;

      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId, jobseekerId: id },
      });
      if (!affiliation) {
        return res.status(404).json({ success: false, error: 'Candidat non trouvé dans votre vivier.' });
      }

      const clean = note ? String(note) : null;
      await prisma.businessAffiliation.update({ where: { id: affiliation.id }, data: { note: clean } });
      res.json({ success: true, note: clean });
    } catch (error: any) {
      console.error('Business updateJobseekerNote error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de l'enregistrement de la note." });
    }
  },

  // Contenu d'un CV d'un candidat AFFILIÉ (lecture seule — adhérent de l'organisme).
  getJobseekerCv: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { id, cvId } = req.params;

      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId, jobseekerId: id },
      });
      if (!affiliation) {
        return res.status(403).json({ success: false, error: 'Ce candidat n\'est pas dans votre vivier.' });
      }

      const cv = await prisma.cV.findFirst({ where: { id: cvId, userId: id } });
      if (!cv) return res.status(404).json({ success: false, error: 'CV non trouvé.' });

      res.json({
        success: true,
        cv: { id: cv.id, title: cv.title, template: cv.template, content: cv.content, updatedAt: cv.updatedAt },
      });
    } catch (error: any) {
      console.error('Business getJobseekerCv error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement du CV.' });
    }
  },

  // Retire un candidat du vivier. Si c'est un candidat « géré » (créé par ce recruteur),
  // on supprime aussi sa fiche (cascade) ; sinon on retire seulement l'affiliation.
  removeJobseeker: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { id } = req.params;

      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId, jobseekerId: id },
      });
      if (!affiliation) {
        return res.status(404).json({ success: false, error: 'Candidat non trouvé dans votre vivier.' });
      }

      const candidate = await prisma.user.findUnique({
        where: { id },
        select: { managedByBusinessId: true },
      });

      if (candidate?.managedByBusinessId === businessId) {
        await prisma.user.delete({ where: { id } }); // cascade : supprime l'affiliation
      } else {
        await prisma.businessAffiliation.delete({ where: { id: affiliation.id } });
      }

      res.json({ success: true, message: 'Candidat retiré du vivier.' });
    } catch (error: any) {
      console.error('Business removeJobseeker error:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du retrait du candidat.' });
    }
  },

  // ==================== FACTURATION (STRIPE) ====================

  // Lance un abonnement Business (Essentiel/Pro) via Stripe Checkout.
  createBillingCheckout: async (req: Request, res: Response) => {
    try {
      const planKey = String(req.body?.plan || '');
      if (!BUSINESS_PLANS[planKey]) {
        return res.status(400).json({ success: false, error: 'Plan inconnu.' });
      }
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) return res.status(404).json({ success: false, error: 'Compte introuvable.' });

      const { url } = await stripeService.createBusinessCheckoutSession(user.id, user.email, planKey);
      res.json({ success: true, url });
    } catch (error: any) {
      console.error('Business createBillingCheckout error:', error);
      res.status(500).json({ success: false, error: error.message || 'Erreur lors de la création du paiement.' });
    }
  },

  // Ouvre le portail client Stripe (factures, moyen de paiement, résiliation).
  createBillingPortal: async (req: Request, res: Response) => {
    try {
      const { url } = await stripeService.createBillingPortalSession(req.userId!);
      res.json({ success: true, url });
    } catch (error: any) {
      console.error('Business createBillingPortal error:', error);
      res.status(500).json({ success: false, error: error.message || "Erreur lors de l'ouverture du portail de facturation." });
    }
  },

  // Demande de devis Entreprise : envoie un email interne à Joboost (Reply-To = recruteur).
  requestQuote: async (req: Request, res: Response) => {
    try {
      const { organizationName, phone, membersCount, recruitersCount, message } = req.body || {};

      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        include: { organization: true },
      });
      if (!user) return res.status(404).json({ success: false, error: 'Compte introuvable.' });

      const orgName = String(organizationName || user.organization?.name || '').trim();
      if (!orgName) {
        return res.status(400).json({ success: false, error: "Indiquez le nom de votre organisation." });
      }

      const result = await emailService.sendBusinessQuoteRequest({
        organizationName: orgName.slice(0, 200),
        contactName: user.name,
        contactEmail: user.email,
        phone: phone ? String(phone).slice(0, 50) : undefined,
        membersCount: membersCount ? String(membersCount).slice(0, 100) : undefined,
        recruitersCount: recruitersCount ? String(recruitersCount).slice(0, 100) : undefined,
        message: message ? String(message).slice(0, 2000) : undefined,
      });

      if (!result.sent) {
        return res.status(502).json({
          success: false,
          error: "L'envoi automatique est indisponible — écrivez-nous directement à joboost.ai@gmail.com.",
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Business requestQuote error:', error);
      res.status(500).json({ success: false, error: "Erreur lors de l'envoi de la demande de devis." });
    }
  },

  // ==================== IA RECRUTEUR ====================

  // Rédige le corps d'une offre (+ compétences suggérées) à partir des infos du formulaire.
  // Réservé aux plans avec IA (Business Pro + période de découverte), borné par aiLimiter.
  assistOffer: async (req: Request, res: Response) => {
    try {
      const { title, contractType, location, salaryRange, skills, notes } = req.body;
      if (!title || !String(title).trim()) {
        return res.status(400).json({ success: false, error: "L'intitulé du poste est requis pour générer l'offre." });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        include: { organization: true },
      });

      if (user && !aiEnabledFor(user)) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_REQUIRED',
          error: `Votre période de découverte de ${DISCOVERY_DAYS} jours est terminée. Demandez votre devis (onglet Abonnement) pour réactiver l'assistant IA.`,
        });
      }

      const data = await geminiService.generateJobOfferContent({
        title: String(title).trim(),
        contractType: contractType ? String(contractType) : undefined,
        location: location ? String(location) : undefined,
        salaryRange: salaryRange ? String(salaryRange) : undefined,
        skills: Array.isArray(skills) ? skills.map((s: string) => String(s)).filter(Boolean) : undefined,
        companyName: user?.organization?.name || undefined,
        notes: notes ? String(notes).slice(0, 1500) : undefined,
      });

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Business assistOffer error:', error);
      res.status(500).json({ success: false, error: error.message || "Erreur lors de la génération de l'offre." });
    }
  },

  // Email d'approche IA pour un candidat du vivier (contrôle d'affiliation obligatoire).
  generateOutreach: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;
      const { id } = req.params;
      const { offerTitle } = req.body || {};

      const affiliation = await prisma.businessAffiliation.findFirst({
        where: { businessId, jobseekerId: id },
        include: {
          jobseeker: { select: { name: true, title: true, skills: true } },
        },
      });
      if (!affiliation) {
        return res.status(404).json({ success: false, error: 'Candidat non trouvé dans votre vivier.' });
      }

      const recruiter = await prisma.user.findUnique({
        where: { id: businessId },
        include: { organization: true },
      });

      if (recruiter && !aiEnabledFor(recruiter)) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_REQUIRED',
          error: `Votre période de découverte de ${DISCOVERY_DAYS} jours est terminée. Demandez votre devis (onglet Abonnement) pour réactiver l'assistant IA.`,
        });
      }

      const message = await geminiService.generateCandidateOutreach({
        candidateName: affiliation.jobseeker.name || 'Candidat',
        candidateTitle: affiliation.jobseeker.title || undefined,
        candidateSkills: affiliation.jobseeker.skills || [],
        offerTitle: offerTitle ? String(offerTitle).slice(0, 200) : undefined,
        companyName: recruiter?.organization?.name || undefined,
        recruiterName: recruiter?.name || undefined,
      });

      res.json({ success: true, data: message });
    } catch (error: any) {
      console.error('Business generateOutreach error:', error);
      res.status(500).json({ success: false, error: error.message || "Erreur lors de la génération du message." });
    }
  },

  // ==================== STATS ====================

  getStats: async (req: Request, res: Response) => {
    try {
      const businessId = req.userId!;

      // --- 1. Résolution de la fenêtre temporelle (liberté : période + perso) ---
      const period = (req.query.period as string) || '6m';
      const now = new Date();
      let to = req.query.to ? new Date(req.query.to as string) : new Date(now);
      let from: Date;

      if (req.query.from) {
        from = new Date(req.query.from as string);
      } else {
        from = new Date(now);
        switch (period) {
          case '7d': from.setDate(from.getDate() - 7); break;
          case '30d': from.setDate(from.getDate() - 30); break;
          case '3m': from.setMonth(from.getMonth() - 3); break;
          case '12m': from.setMonth(from.getMonth() - 12); break;
          case '6m':
          default: from.setMonth(from.getMonth() - 6); break;
        }
      }
      // Sécurité : bornes cohérentes
      if (from > to) [from, to] = [to, from];

      const spanMs = to.getTime() - from.getTime();
      const spanDays = spanMs / (1000 * 60 * 60 * 24);
      const granularity: 'day' | 'month' = spanDays <= 62 ? 'day' : 'month';

      // Fenêtre précédente (même durée, juste avant) pour les comparaisons
      const prevTo = new Date(from);
      const prevFrom = new Date(from.getTime() - spanMs);

      // --- 2. Filtres optionnels (liberté : segmenter) ---
      const statusFilter = (req.query.status as string) || undefined;
      const skillFilter = (req.query.skill as string) || undefined;

      const jobseekerFilter = skillFilter ? { skills: { hasSome: [skillFilter] } } : undefined;
      const baseAffiliationWhere: any = { businessId };
      if (statusFilter) baseAffiliationWhere.status = statusFilter;
      if (jobseekerFilter) baseAffiliationWhere.jobseeker = jobseekerFilter;

      // --- 3. KPIs ---
      // Total adhérents actifs (snapshot, respecte le filtre compétence)
      const totalActive = await prisma.businessAffiliation.count({
        where: { businessId, status: 'active', ...(jobseekerFilter ? { jobseeker: jobseekerFilter } : {}) },
      });

      // Nouveaux adhérents dans la fenêtre + fenêtre précédente (delta)
      const newInPeriod = await prisma.businessAffiliation.count({
        where: { ...baseAffiliationWhere, affiliatedAt: { gte: from, lte: to } },
      });
      const newInPrevPeriod = await prisma.businessAffiliation.count({
        where: { ...baseAffiliationWhere, affiliatedAt: { gte: prevFrom, lt: prevTo } },
      });
      const newInPeriodDelta = pctDelta(newInPeriod, newInPrevPeriod);

      // Dataset d'adhérents (pour complétion + compétences)
      const affiliatedUsers = await prisma.businessAffiliation.findMany({
        where: baseAffiliationWhere,
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

      // Candidatures des adhérents dans la fenêtre + fenêtre précédente (delta)
      const affiliatedIds = affiliatedUsers.map((a) => a.jobseekerId);

      const applicationCount = affiliatedIds.length > 0
        ? await prisma.application.count({
            where: { userId: { in: affiliatedIds }, appliedAt: { gte: from, lte: to } },
          })
        : 0;
      const applicationCountPrev = affiliatedIds.length > 0
        ? await prisma.application.count({
            where: { userId: { in: affiliatedIds }, appliedAt: { gte: prevFrom, lt: prevTo } },
          })
        : 0;
      const applicationCountDelta = pctDelta(applicationCount, applicationCountPrev);

      // --- 4. Répartition par statut (donut) — non filtrée par statut pour rester lisible ---
      const statusDistribution = await prisma.businessAffiliation.groupBy({
        by: ['status'],
        where: { businessId, ...(jobseekerFilter ? { jobseeker: jobseekerFilter } : {}) },
        _count: { _all: true },
      });

      const statusBreakdown = statusDistribution.map((s) => ({
        status: s.status,
        count: s._count._all,
      }));

      // --- 5. Évolution des affiliations (granularité adaptative) ---
      const recentAffiliations = await prisma.businessAffiliation.findMany({
        where: { ...baseAffiliationWhere, affiliatedAt: { gte: from, lte: to } },
        select: { affiliatedAt: true },
        orderBy: { affiliatedAt: 'asc' },
      });

      const bucketKey = (d: Date) =>
        granularity === 'day'
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const bucketMap = new Map<string, number>();
      recentAffiliations.forEach((a) => {
        const key = bucketKey(a.affiliatedAt);
        bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
      });

      // Remplir les buckets manquants (zéros) sur toute la fenêtre
      const growth: { bucket: string; total: number }[] = [];
      const cursor = new Date(from);
      if (granularity === 'day') {
        cursor.setHours(0, 0, 0, 0);
        while (cursor <= to) {
          const key = bucketKey(cursor);
          growth.push({ bucket: key, total: bucketMap.get(key) || 0 });
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        cursor.setDate(1);
        cursor.setHours(0, 0, 0, 0);
        while (cursor <= to) {
          const key = bucketKey(cursor);
          growth.push({ bucket: key, total: bucketMap.get(key) || 0 });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      // --- 6. Top compétences parmi les adhérents ---
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

      // --- 7. Offres ---
      const publishedOffers = await prisma.businessOffer.count({
        where: { businessId, isPublished: true },
      });
      const totalOffers = await prisma.businessOffer.count({
        where: { businessId },
      });

      res.json({
        success: true,
        stats: {
          range: {
            from: from.toISOString(),
            to: to.toISOString(),
            period: req.query.from ? 'custom' : period,
            granularity,
          },
          kpis: {
            totalActive,
            newInPeriod,
            newInPeriodDelta,
            avgProfileCompletion,
            applicationCount,
            applicationCountDelta,
          },
          statusBreakdown,
          growth,
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

// Variation en % entre deux valeurs ; null si la base est nulle (delta non calculable honnêtement)
function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
