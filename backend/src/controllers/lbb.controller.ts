import { Request, Response } from 'express';
import { prisma } from '../db';
import { geminiService } from '../services/gemini.service';
import { usageService } from '../services/usage.service';
import { franceTravailService, isFranceTravailConfigured, FtCompany } from '../services/francetravail.service';

// Données de démonstration utilisées en repli si France Travail n'est pas configuré
// ou momentanément indisponible (l'API renvoie parfois des 500 le temps de l'activation).
const demoCompanies = (targetTitle: string, targetLocation: string): FtCompany[] => ([
  {
    id: 'demo_01',
    name: `Agence Digitale ${targetLocation}`,
    address: `12 Rue de l'innovation, ${targetLocation}`,
    sector: 'Services Numériques',
    hiringPotential: 'Élevé',
    size: '10-49 salariés',
    matchedJob: targetTitle,
    reason: `Exemple de démonstration (France Travail momentanément indisponible). Cette entreprise a recruté des profils ${targetTitle} récemment.`,
    contactRole: 'Responsable Technique',
    offerUrl: '',
  },
  {
    id: 'demo_02',
    name: `Tech Startup Innov' ${targetLocation}`,
    address: `Quartier Tech, ${targetLocation}`,
    sector: 'Édition de logiciels',
    hiringPotential: 'Très Élevé',
    size: '50-250 salariés',
    matchedJob: targetTitle,
    reason: 'Exemple de démonstration. En forte croissance, recrute régulièrement dans la tech.',
    contactRole: 'CTO ou RH',
    offerUrl: '',
  },
  {
    id: 'demo_03',
    name: 'Groupe E-commerce régional',
    address: `Z.I ${targetLocation}`,
    sector: 'E-Commerce',
    hiringPotential: 'Moyen',
    size: '250+ salariés',
    matchedJob: targetTitle,
    reason: "Exemple de démonstration. Accepte fréquemment les candidatures spontanées sur ce bassin d'emploi.",
    contactRole: 'Service RH',
    offerUrl: '',
  },
]);

export const lbbController = {
  searchCompanies: async (req: Request, res: Response) => {
    const targetTitle = (req.query.jobTitle as string) || 'Développeur';
    const targetLocation = (req.query.location as string) || 'Paris';

    try {
      // 1. On tente les VRAIES offres France Travail si les identifiants sont configurés.
      if (isFranceTravailConfigured()) {
        try {
          const real = await franceTravailService.searchCompanies(targetTitle, targetLocation);
          if (real.length > 0) {
            return res.json({ success: true, source: 'francetravail', results: real });
          }
          // Aucune entreprise nommée trouvée → on retombe sur la démo plus bas.
        } catch (e: any) {
          // France Travail indisponible (ex. 500 le temps de l'activation) → repli silencieux sur la démo.
          console.error('France Travail indisponible, repli sur la démo :', e?.message || e);
        }
      }

      // 2. Repli : données de démonstration (clairement étiquetées comme telles dans le contenu).
      return res.json({ success: true, source: 'demo', results: demoCompanies(targetTitle, targetLocation) });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la recherche des entreprises.' });
    }
  },

  applySpontaneous: async (req: Request, res: Response) => {
    try {
      const { company, jobTitle, reason, includeLetter, applyUrl } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      }

      // Génération de la lettre de motivation (si demandée) = 1 candidature IA.
      // On débite quota mensuel → crédits, sinon blocage 402, et remboursement si échec.
      let coverLetterText = '';
      if (includeLetter) {
        const consumption = await usageService.consumeCandidature(req.userId!);
        if (!consumption.allowed) {
          return res.status(402).json({
            success: false,
            code: 'QUOTA_EXCEEDED',
            error: "Vous avez atteint votre limite de candidatures ce mois-ci. Passez à l'abonnement Élite ou ajoutez un pack de crédits.",
          });
        }
        try {
          coverLetterText = await geminiService.generateCoverLetter(
            jobTitle,
            company,
            'Professionnel et direct',
            user,
            `Raison de la candidature : ${reason}`
          );
        } catch (e: any) {
          if (consumption.source) await usageService.refundCandidature(req.userId!, consumption.source);
          console.error('Erreur IA lors de la génération de lettre', e);
          return res.status(503).json({ success: false, error: "Impossible de formuler la lettre via l'IA. Candidature annulée." });
        }
      }

      // Enregistrement de la candidature dans le suivi (kanban) de l'utilisateur.
      // NB honnêteté : l'API partenaire France Travail ne permet pas de SOUMETTRE une candidature
      // à l'employeur à la place du candidat. On prépare donc la lettre + on suit la candidature,
      // et on fournit le lien réel de l'offre pour postuler. Statut PENDING = "à postuler".
      const linkLine = applyUrl ? `\nLien pour postuler : ${applyUrl}` : '';
      const application = await prisma.application.create({
        data: {
          company,
          title: jobTitle,
          status: 'PENDING',
          source: 'France Travail',
          notes: `Candidature spontanée préparée via Joboost.\nCible : ${reason}${linkLine}\n\nLettre IA : ${includeLetter ? 'générée et prête à joindre' : 'non générée'}`,
          userId: user.id,
        },
      });

      res.json({ success: true, application, coverLetter: coverLetterText, applyUrl: applyUrl || '' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de l'enregistrement de la candidature." });
    }
  },
};
