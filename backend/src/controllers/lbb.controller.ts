import { Request, Response } from 'express';
import { prisma } from '../db';
import { geminiService } from '../services/gemini.service';

// Ce mock intelligent retourne un format compatible avec une API type "La Bonne Boîte"
export const lbbController = {
  searchCompanies: async (req: Request, res: Response) => {
    try {
      const { jobTitle, location } = req.query;
      
      const targetTitle = (jobTitle as string) || "Développeur";
      const targetLocation = (location as string) || "Paris";

      const mockedCompanies = [
        {
          id: 'lbb_01',
          name: `Agence Digitale ${targetLocation}`,
          address: `12 Rue de l'innovation, ${targetLocation}`,
          sector: "Services Numériques",
          hiringPotential: "Élevé", // Equivalent d'un potentiel d'embauche
          size: "10-49 salariés",
          matchedJob: targetTitle,
          reason: `Données analytiques FT : Cette entreprise a recruté 3 profils similaires (${targetTitle}) ces 12 derniers mois.`,
          websiteUrl: "#",
          contactRole: "Responsable Technique"
        },
        {
          id: 'lbb_02',
          name: `Tech Startup Innov' ${targetLocation}`,
          address: `Quartier Tech, ${targetLocation}`,
          sector: "Édition de logiciels",
          hiringPotential: "Très Élevé",
          size: "50-250 salariés",
          matchedJob: targetTitle,
          reason: "En forte croissance (levée de fonds récente), recrute continuellement dans l'ingénierie tech.",
          websiteUrl: "#",
          contactRole: "CTO ou RH"
        },
        {
          id: 'lbb_03',
          name: `Groupe E-commerce régional`,
          address: `Z.I ${targetLocation}`,
          sector: "E-Commerce",
          hiringPotential: "Moyen",
          size: "250+ salariés",
          matchedJob: targetTitle,
          reason: "Turn-over naturel. Accepte fréquemment les candidatures spontanées sur ce bassin d'emploi.",
          websiteUrl: "#",
          contactRole: "Service RH"
        }
      ];

      // Simule une petite latence réseau API externe
      await new Promise(resolve => setTimeout(resolve, 500));
      res.json({ success: true, results: mockedCompanies });

    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur lors de la recherche des entreprises." });
    }
  },

  applySpontaneous: async (req: Request, res: Response) => {
    try {
      const { company, jobTitle, reason, includeLetter } = req.body;
      
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) {
        return res.status(404).json({ success: false, error: "Utilisateur non trouvé." });
      }

      // 2. Génération de la lettre de motivation (si demandée)
      let coverLetterText = "";
      if (includeLetter) {
        try {
          // Utilisation du mode texte avec la raison LBB comme contexte de l'offre
          coverLetterText = await geminiService.generateCoverLetter(
            jobTitle, 
            company, 
            "Professionnel et direct", 
            user, 
            `Raison de la candidature (données LBB) : ${reason}`
          );
        } catch (e: any) {
          console.error("Erreur IA lors de la génération de lettre pour LBB", e);
          return res.status(503).json({ success: false, error: "Impossible de formuler la lettre via l'IA. Application annulée." });
        }
      }

      // 3. Mock d'envoi vers l'API France Travail / La Bonne Boîte
      // Dans la V2, brancher axios.post('https://api.francetravail.io/partenaire/labonneboite...') avec le token OAuth2
      const payloadLBB = {
        candidate: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          title: user.title,
          skills: user.skills
        },
        targetCompany: company,
        targetJob: jobTitle,
        message: coverLetterText || "Candidature spontanée sans lettre jointe."
      };
      
      // Simulation network latency (API call)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // 4. Enregistrement local en Base de données (Puisque le proxy API a simulé un 200 OK)
      const application = await prisma.application.create({
        data: {
          company: company,
          title: jobTitle,
          status: 'SENT',
          source: 'La Bonne Boîte API',
          notes: `Candidature spontanée transmise via LBB.\nPotentiel/Raison: ${reason}\n\n[Payload IA]: ${includeLetter ? 'Lettre générée et jointe' : 'Sans lettre'}`,
          userId: user.id
        }
      });

      res.json({ success: true, application, payloadSimule: payloadLBB });

    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: "Erreur critique de transmission vers Pôle Emploi." });
    }
  }
};
