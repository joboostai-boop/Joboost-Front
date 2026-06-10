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
export const OFFRES_SCOPE = 'api_offresdemploiv2 o2dsoffre';

export const isFranceTravailConfigured = (): boolean => Boolean(FT_CLIENT_ID && FT_CLIENT_SECRET);

// Cache des jetons applicatifs, indexé par scope (chaque API FT a son propre scope).
const tokenCache = new Map<string, { value: string; expiresAt: number }>();

/** Récupère (et met en cache) un jeton applicatif France Travail pour un scope donné. */
export const getFtToken = async (scope: string = OFFRES_SCOPE): Promise<string> => {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.value;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: FT_CLIENT_ID,
    client_secret: FT_CLIENT_SECRET,
    scope,
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
  tokenCache.set(scope, {
    value: json.access_token,
    expiresAt: Date.now() + ((json.expires_in ?? 1200) * 1000),
  });
  return json.access_token;
};

// Format "entreprise" attendu par le front (page Spontaneous / La Bonne Boîte)
export interface FtCompany {
  id: string;
  name: string;
  address: string;
  sector: string;
  hiringPotential: string;
  size: string;          // taille d'entreprise (effectif) — souvent non communiquée par FT
  contractType: string;  // type de contrat de l'offre (CDI, CDD…) — anciennement mis à tort dans `size`
  matchedJob: string;
  reason: string;
  contactRole: string;
  offerUrl: string;
  domain?: string;       // domaine web de l'entreprise si exposé par FT (sert à estimer l'email)
}

// Offre d'emploi réelle au format attendu par le front "Offres pour moi"
export interface FtOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  matchScore: number;
  postedDate: string;
  source: string;
  url: string;
  tags: string[];
  aiInsight: string;
}

// Met en forme une date de publication en libellé relatif FR ("Il y a 2 jours", "Aujourd'hui").
const relativeDate = (iso?: string): string => {
  if (!iso) return 'Récemment';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Récemment';
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return d.toLocaleDateString('fr-FR');
};

// Extrait un code département (2 chiffres) d'une localisation libre : "Paris 75" -> "75", "75008" -> "75", "Lyon 69" -> "69"
const extractDepartement = (location: string): string | undefined => {
  const m = (location || '').match(/\b(\d{2})\d{0,3}\b/);
  return m ? m[1] : undefined;
};

// Extrait un domaine ("monentreprise.fr") depuis une URL d'entreprise renvoyée par FT, le cas échéant.
const extractDomain = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '') || undefined;
  } catch {
    return undefined;
  }
};

export const franceTravailService = {
  /**
   * Recherche de vraies offres et regroupement par entreprise recruteuse.
   * Renvoie des "cartes entreprise" pour la candidature spontanée.
   */
  searchCompanies: async (jobTitle: string, location: string, max = 15): Promise<FtCompany[]> => {
    const token = await getFtToken();

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
        // FT (API Offres v2) ne fournit pas l'effectif de l'entreprise ; on l'affiche comme non communiqué.
        size: 'Effectif non communiqué',
        contractType: first?.typeContratLibelle || first?.natureContrat || 'Contrat à préciser',
        domain: extractDomain(first?.entreprise?.url),
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

  /**
   * Recherche de vraies offres d'emploi (alimente "Offres pour moi").
   * Renvoie chaque offre individuellement, mappée au format attendu par le front.
   */
  searchOffers: async (jobTitle: string, location: string, max = 15): Promise<FtOffer[]> => {
    const token = await getFtToken();

    const params = new URLSearchParams();
    if (jobTitle) params.set('motsCles', jobTitle);
    const dep = extractDepartement(location);
    if (dep) params.set('departement', dep);
    params.set('range', `0-${Math.max(0, max - 1)}`);

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (res.status === 204) return [];
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`France Travail search error ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const offers: any[] = Array.isArray(json?.resultats) ? json.resultats : [];

    return offers.map((o, index): FtOffer => {
      // Tags : compétences listées par FT, sinon le libellé ROME.
      const competences: any[] = Array.isArray(o?.competences) ? o.competences : [];
      const tags = competences.map((c) => c?.libelle).filter(Boolean).slice(0, 3);
      if (tags.length === 0 && o?.romeLibelle) tags.push(o.romeLibelle);

      // Insight : début de la description de l'offre (nettoyé), sinon message générique.
      const rawDesc: string = (o?.description || '').replace(/\s+/g, ' ').trim();
      const aiInsight = rawDesc
        ? `${rawDesc.slice(0, 220)}${rawDesc.length > 220 ? '…' : ''}`
        : `Offre publiée sur France Travail correspondant à votre recherche « ${jobTitle} ».`;

      return {
        id: `ft_${o.id}`,
        title: o?.intitule || jobTitle,
        company: o?.entreprise?.nom?.trim() || 'Entreprise confidentielle',
        location: o?.lieuTravail?.libelle || location || 'France',
        salary: o?.salaire?.libelle?.trim() || 'Salaire non précisé',
        type: o?.typeContratLibelle || o?.natureContrat || 'Contrat à préciser',
        // FT renvoie les résultats par pertinence : on dérive un score décroissant 96 → 70.
        matchScore: Math.max(70, 96 - index * 3),
        postedDate: relativeDate(o?.dateCreation),
        source: 'France Travail',
        url: o?.origineOffre?.urlOrigine || '',
        tags,
        aiInsight,
      };
    });
  },

  /**
   * Résout le code ROME dominant pour un métier + lieu via l'API Offres (déjà autorisée).
   * Sert d'entrée à La Bonne Boîte (qui exige un code ROME, pas du texte libre).
   */
  resolveRomeCode: async (jobTitle: string, location: string): Promise<string | undefined> => {
    const token = await getFtToken();
    const params = new URLSearchParams();
    if (jobTitle) params.set('motsCles', jobTitle);
    const dep = extractDepartement(location);
    if (dep) params.set('departement', dep);
    params.set('range', '0-24');

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (res.status === 204) return undefined;
    if (!res.ok) return undefined;

    const json: any = await res.json();
    const offers: any[] = Array.isArray(json?.resultats) ? json.resultats : [];

    // Code ROME le plus fréquent parmi les offres correspondant au métier recherché.
    const tally = new Map<string, number>();
    for (const o of offers) {
      const code: string | undefined = o?.romeCode;
      if (code) tally.set(code, (tally.get(code) || 0) + 1);
    }
    let best: string | undefined;
    let bestCount = 0;
    for (const [code, count] of tally) {
      if (count > bestCount) { best = code; bestCount = count; }
    }
    return best;
  },
};
