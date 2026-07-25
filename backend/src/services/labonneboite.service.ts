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

// La Bonne Boîte **v2** : l'API exige TROIS scopes (`search office api_labonneboitev2`),
// sinon le gateway répond 403 « Invalid scope ». La v1 est morte (invalid_scope).
// Endpoint de recherche : GET {base}/recherche. Surchargeable par env.
const LBB_SCOPE = process.env.LBB_SCOPE || 'search office api_labonneboitev2';
const LBB_BASE = (process.env.LBB_API_BASE || 'https://api.francetravail.io/partenaire/labonneboite/v2').replace(/\/$/, '');
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

// v2 : `hiring_potential` est un score 0-100 (et non plus des étoiles /5).
const potentialFromScore = (score: number): string => {
  if (score >= 80) return 'Très Élevé';
  if (score >= 60) return 'Élevé';
  if (score >= 40) return 'Modéré';
  return 'Moyen';
};

// Effectif lisible à partir des bornes renvoyées par l'API.
const headcountLabel = (min?: number, max?: number): string => {
  if (!min && !max) return 'Effectif non communiqué';
  if (min && max) return `${min} à ${max} salariés`;
  return `${min || max}+ salariés`;
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
      rome: romeCode,
      latitude: String(geo.lat),
      longitude: String(geo.lon),
      distance: String(distanceKm),
      page: '1',
      page_size: String(Math.min(100, Math.max(1, max))),
    });

    const res = await fetch(`${LBB_BASE}/recherche?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (res.status === 204) return [];
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`La Bonne Boîte error ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const companies: any[] = Array.isArray(json?.items) ? json.items : [];

    return companies.map((c): FtCompany => {
      const score = Number(c?.hiring_potential ?? 0);
      const addressParts = [c?.postcode, c?.city].filter(Boolean).join(' ');
      // v2 n'expose ni site ni email : seul un indicateur `email` ("yes"/"no")
      // signale que l'entreprise accepte les candidatures par email.
      const acceptsEmail = String(c?.email || '').toLowerCase() === 'yes';
      return {
        id: `lbb_${c?.siret || c?.id}`,
        name: (c?.company_name || c?.office_name || 'Entreprise').trim(),
        address: addressParts || c?.city || c?.department || 'France',
        sector: c?.naf_label || c?.naf || 'Secteur non précisé',
        hiringPotential: potentialFromScore(score),
        size: headcountLabel(c?.headcount_min, c?.headcount_max),
        contractType: 'Candidature spontanée',
        domain: undefined, // non fourni par l'API v2
        matchedJob: jobTitle,
        reason: `Entreprise du marché caché : identifiée par La Bonne Boîte (France Travail) comme susceptible de recruter dans les 6 prochains mois sur le métier « ${jobTitle} »${
          score ? ` (potentiel ${Math.round(score)}/100)` : ''
        }.${acceptsEmail ? ' Elle accepte les candidatures par email.' : ''}`,
        contactRole: 'Service Recrutement',
        offerUrl: '',
      };
    });
  },
};
