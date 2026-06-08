import dotenv from 'dotenv';
dotenv.config();

// ====================================================================
//  Service France Travail — vraies offres d'emploi (API "Offres d'emploi v2")
//  Flux OAuth2 client_credentials (jeton applicatif, mis en cache).
//  Doc : https://francetravail.io/data/api/offres-emploi
// ====================================================================

const FT_CLIENT_ID = process.env.FRANCE_TRAVAIL_CLIENT_ID || '';
const FT_CLIENT_SECRET = process.env.FRANCE_TRAVAIL_CLIENT_SECRET || '';

const TOKEN_URL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';
const SEARCH_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';
const SCOPE = 'api_offresdemploiv2 o2dsoffre';

export const isFranceTravailConfigured = (): boolean => Boolean(FT_CLIENT_ID && FT_CLIENT_SECRET);

// Cache du jeton applicatif (évite d'en redemander un à chaque recherche)
let cachedToken: { value: string; expiresAt: number } | null = null;

const getAppToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: FT_CLIENT_ID,
    client_secret: FT_CLIENT_SECRET,
    scope: SCOPE,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`France Travail token error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json: any = await res.json();
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + ((json.expires_in ?? 1200) * 1000),
  };
  return cachedToken.value;
};

// Format "entreprise" attendu par le front (page Spontaneous / La Bonne Boîte)
export interface FtCompany {
  id: string;
  name: string;
  address: string;
  sector: string;
  hiringPotential: string;
  size: string;
  matchedJob: string;
  reason: string;
  contactRole: string;
  offerUrl: string;
}

// Extrait un code département (2 chiffres) d'une localisation libre : "Paris 75" -> "75", "75008" -> "75", "Lyon 69" -> "69"
const extractDepartement = (location: string): string | undefined => {
  const m = (location || '').match(/\b(\d{2})\d{0,3}\b/);
  return m ? m[1] : undefined;
};

export const franceTravailService = {
  /**
   * Recherche de vraies offres et regroupement par entreprise recruteuse.
   * Renvoie des "cartes entreprise" pour la candidature spontanée.
   */
  searchCompanies: async (jobTitle: string, location: string, max = 15): Promise<FtCompany[]> => {
    const token = await getAppToken();

    const params = new URLSearchParams();
    if (jobTitle) params.set('motsCles', jobTitle);
    const dep = extractDepartement(location);
    if (dep) params.set('departement', dep);
    params.set('range', `0-${Math.max(0, max - 1)}`);

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    // 204 = aucune offre ; 200 (tous) / 206 (résultat partiel paginé) = OK
    if (res.status === 204) return [];
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`France Travail search error ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const offers: any[] = Array.isArray(json?.resultats) ? json.resultats : [];

    // Regroupe les offres par entreprise nommée (les offres anonymes sont écartées de l'affichage entreprise)
    const byCompany = new Map<string, any[]>();
    for (const o of offers) {
      const name: string | undefined = o?.entreprise?.nom?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!byCompany.has(key)) byCompany.set(key, []);
      byCompany.get(key)!.push(o);
    }

    const companies: FtCompany[] = [];
    for (const group of byCompany.values()) {
      const first = group[0];
      const count = group.length;
      const datePub = first?.dateCreation ? new Date(first.dateCreation).toLocaleDateString('fr-FR') : '';

      companies.push({
        id: `ft_${first.id}`,
        name: first.entreprise.nom,
        address: first?.lieuTravail?.libelle || location || 'France',
        sector: first?.secteurActiviteLibelle || first?.romeLibelle || 'Secteur non précisé',
        hiringPotential: count >= 3 ? 'Très Élevé' : count === 2 ? 'Élevé' : 'Modéré',
        size: first?.typeContratLibelle || first?.natureContrat || 'Contrat à préciser',
        matchedJob: first?.intitule || jobTitle,
        reason: count > 1
          ? `${count} offres ouvertes actuellement (ex : « ${first.intitule} »). Entreprise en recrutement actif — candidature spontanée pertinente. Source : France Travail.`
          : `Offre réelle en cours : « ${first.intitule} »${datePub ? `, publiée le ${datePub}` : ''}. Source : France Travail.`,
        contactRole: first?.contact?.nom || 'Service Recrutement',
        offerUrl: first?.origineOffre?.urlOrigine || '',
      });
    }

    return companies;
  },
};
