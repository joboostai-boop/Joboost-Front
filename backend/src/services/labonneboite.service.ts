import { getFtToken, isFranceTravailConfigured, FtCompany } from './francetravail.service';

// ====================================================================
//  Service "La Bonne Boîte" (France Travail) — entreprises à fort potentiel
//  d'embauche pour les candidatures spontanées. API distincte de l'API Offres.
//  Doc : https://francetravail.io/data/api/labonneboite
//
//  Flux : code ROME + géolocalisation (lat/lon) + rayon → entreprises notées
//  (champ `stars` 0-5). Réutilise les identifiants FT avec le scope LBB.
//
//  Tout est guardé : si le scope LBB n'est pas autorisé sur l'app FT, l'appelant
//  retombe proprement sur l'approche "offres regroupées par entreprise".
// ====================================================================

const LBB_SCOPE = process.env.LBB_SCOPE || 'api_labonneboitev1';
const LBB_BASE = process.env.LBB_API_BASE || 'https://api.francetravail.io/partenaire/labonneboite/v1/company/';
const GEOCODE_URL = 'https://api-adresse.data.gouv.fr/search/';

export const isLbbConfigured = (): boolean => isFranceTravailConfigured();

export interface GeoPoint { lat: number; lon: number; }

/** Géocode une localisation libre ("Paris 75", "Lyon") en lat/lon via l'API adresse (gratuite, sans clé). */
export const geocodeLocation = async (location: string): Promise<GeoPoint | undefined> => {
  if (!location) return undefined;
  try {
    const url = `${GEOCODE_URL}?q=${encodeURIComponent(location)}&limit=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return undefined;
    const json: any = await res.json();
    const coords = json?.features?.[0]?.geometry?.coordinates; // [lon, lat]
    if (Array.isArray(coords) && coords.length === 2) {
      return { lon: Number(coords[0]), lat: Number(coords[1]) };
    }
  } catch {
    /* géocodage indisponible → on laisse l'appelant gérer le repli */
  }
  return undefined;
};

const potentialFromStars = (stars: number): string => {
  if (stars >= 4) return 'Très Élevé';
  if (stars >= 3) return 'Élevé';
  if (stars >= 2) return 'Modéré';
  return 'Moyen';
};

const extractDomain = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '') || undefined;
  } catch {
    return undefined;
  }
};

export const laBonneBoiteService = {
  /**
   * Recherche d'entreprises qui recrutent (La Bonne Boîte) pour un code ROME donné.
   * Renvoie des cartes entreprise au format FtCompany (compatibilité front + scoring).
   */
  searchHiringCompanies: async (
    romeCode: string,
    geo: GeoPoint,
    jobTitle: string,
    distanceKm = 30,
    max = 20,
  ): Promise<FtCompany[]> => {
    const token = await getFtToken(LBB_SCOPE);

    const params = new URLSearchParams({
      latitude: String(geo.lat),
      longitude: String(geo.lon),
      distance: String(distanceKm),
      rome_codes: romeCode,
      sort: 'score',
      page: '1',
      page_size: String(max),
    });

    const res = await fetch(`${LBB_BASE}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (res.status === 204) return [];
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`La Bonne Boîte error ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const companies: any[] = Array.isArray(json?.companies) ? json.companies : [];

    return companies.map((c): FtCompany => {
      const stars = Number(c?.stars ?? 0);
      const website: string | undefined = c?.website || c?.social_network || undefined;
      const addressParts = [c?.address, c?.city].filter(Boolean).join(', ');
      return {
        id: `lbb_${c?.siret || c?.name}`,
        name: c?.name?.trim() || 'Entreprise',
        address: addressParts || c?.city || 'France',
        sector: c?.naf_text || c?.naf || 'Secteur non précisé',
        hiringPotential: potentialFromStars(stars),
        size: c?.headcount_text || 'Effectif non communiqué',
        contractType: 'Candidature spontanée',
        domain: extractDomain(website),
        matchedJob: jobTitle,
        reason: `Entreprise identifiée par La Bonne Boîte (France Travail) comme ayant un fort potentiel d'embauche${
          stars ? ` (${stars}/5)` : ''
        } sur le métier « ${jobTitle} ». Idéale pour une candidature spontanée.`,
        contactRole: 'Service Recrutement',
        offerUrl: c?.url || '',
      };
    });
  },
};
