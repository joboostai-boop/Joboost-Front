import { Request, Response } from 'express';
import { franceTravailService, isFranceTravailConfigured, FtCompany } from '../services/francetravail.service';
import { laBonneBoiteService, geocodeLocation } from '../services/labonneboite.service';
import { loadUserGuards, scoreCompanyForUser } from '../services/spontaneous.guards';
import { AUTO_LEVEL_LABEL } from '../services/spontaneous.scoring.service';
import { companyContactService } from '../services/companyContact.service';
import { TtlCache } from '../services/ttlCache';

// Données La Bonne Boîte mises à jour une fois par mois : 12 h de cache suffisent
// largement, et évitent de buter sur la limite de rythme de l'API.
const lbbCache = new TtlCache<FtCompany[]>(12 * 3600_000, 500);

// Entreprises qui recrutent pour TOUS les codes ROME du métier (100 par code),
// appels espacés (limite de rythme), dédoublonnées par établissement, les plus
// fort potentiel d'embauche en premier.
const searchAllRomes = async (title: string, location: string, distanceKm: number): Promise<FtCompany[]> => {
  const [romes, geo] = await Promise.all([
    franceTravailService.resolveRomeCodes(title, location, 3),
    geocodeLocation(location),
  ]);
  if (!romes.length || !geo) return [];
  const byId = new Map<string, FtCompany>();
  for (const [i, rome] of romes.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 400));
    try {
      const list = await laBonneBoiteService.searchHiringCompanies(rome, geo, title, distanceKm, 100);
      for (const c of list) if (!byId.has(c.id)) byId.set(c.id, c);
    } catch (e: any) {
      if (i === 0) throw e; // le code principal est indispensable ; les suivants sont un bonus
      console.warn('[lbb] code ROME secondaire ignoré', rome, '—', e?.message || e);
    }
  }
  const rank: Record<string, number> = { 'Très Élevé': 4, 'Élevé': 3, 'Modéré': 2, 'Moyen': 1 };
  return [...byId.values()].sort((a, b) => (rank[b.hiringPotential] || 0) - (rank[a.hiringPotential] || 0));
};

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
    contractType: 'CDI',
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
    contractType: 'CDI',
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
    contractType: 'CDI',
    matchedJob: targetTitle,
    reason: "Exemple de démonstration. Accepte fréquemment les candidatures spontanées sur ce bassin d'emploi.",
    contactRole: 'Service RH',
    offerUrl: '',
  },
]);

// Enrichit chaque carte entreprise avec son niveau d'automatisation, calculé pour l'utilisateur.
const enrichWithScoring = async (
  userId: string,
  companies: FtCompany[],
  ftSource: 'francetravail' | 'demo',
) => {
  // Règles du candidat + e-mails déjà connus : deux requêtes au total, quel que
  // soit le nombre d'entreprises (avant : une requête par entreprise).
  const [guards, knownMap] = await Promise.all([
    loadUserGuards(userId),
    companyContactService.lookupMany(companies.map((c) => ({ name: c.name, location: c.address }))),
  ]);
  return Promise.all(
    companies.map(async (c) => {
      // Base partagée : si un email a déjà été trouvé pour cette entreprise
      // (par un autre candidat, une offre ou le détecteur), on le réutilise.
      const known = knownMap.get(companyContactService.keyFor(c.name, c.address)) || null;
      const scoring = await scoreCompanyForUser(
        {
          companyName: c.name,
          domain: c.domain || known?.domain || undefined,
          contactEmail: known?.email,
          contactSource: known ? 'manual' : undefined,
          hiringPotential: c.hiringPotential,
          sector: c.sector,
          companyLocation: c.address,
          ftSource,
          includeLetter: true, // hypothèse d'affichage : lettre incluse (le défaut de l'UI)
        },
        guards,
      );
      return {
        ...c,
        autoLevel: scoring.autoLevel,
        autoLevelLabel: AUTO_LEVEL_LABEL[scoring.autoLevel],
        autoScore: scoring.autoScore,
        autoBlockReason: scoring.autoBlockReason,
        matchScore: scoring.matchScore,
        contactEmail: scoring.contactEmail,
        contactSource: scoring.contactSource,
      };
    }),
  );
};

export const lbbController = {
  searchCompanies: async (req: Request, res: Response) => {
    const targetTitle = (req.query.jobTitle as string) || 'Développeur';
    const targetLocation = (req.query.location as string) || 'Paris';
    // Rayon de recherche en km (paramétrable depuis l'UI ; défaut 30, borné 5–150).
    const distanceKm = Math.min(150, Math.max(5, parseInt(req.query.distance as string) || 30));

    try {
      if (isFranceTravailConfigured()) {
        // 1. La Bonne Boîte : la VRAIE source des candidatures spontanées (entreprises notées).
        //    Nécessite un code ROME + une géolocalisation, qu'on résout au préalable.
        try {
          const lbb = await lbbCache.get(`${targetTitle}|${targetLocation}|${distanceKm}`.toLowerCase(), () =>
            searchAllRomes(targetTitle, targetLocation, distanceKm));
          if (lbb.length > 0) {
            const results = await enrichWithScoring(req.userId!, lbb, 'francetravail');
            return res.json({ success: true, source: 'labonneboite', results });
          }
        } catch (e: any) {
          // Scope LBB non autorisé / API indisponible → repli sur les offres regroupées.
          console.error('La Bonne Boîte indisponible, repli sur les offres regroupées :', e?.message || e);
        }

        // 2. Repli : entreprises déduites des offres France Travail (regroupées par recruteur).
        try {
          const real = await franceTravailService.searchCompanies(targetTitle, targetLocation, 15, distanceKm);
          if (real.length > 0) {
            const results = await enrichWithScoring(req.userId!, real, 'francetravail');
            return res.json({ success: true, source: 'francetravail', results });
          }
        } catch (e: any) {
          console.error('France Travail indisponible, repli sur la démo :', e?.message || e);
        }
      }

      // 3. Repli final : données de démonstration (clairement étiquetées dans le contenu).
      const demo = await enrichWithScoring(req.userId!, demoCompanies(targetTitle, targetLocation), 'demo');
      return res.json({ success: true, source: 'demo', results: demo });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la recherche des entreprises.' });
    }
  },
};
