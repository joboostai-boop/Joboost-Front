import dotenv from 'dotenv';
dotenv.config();
import { extractContactEmail } from './contactEmail.util';

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
  // Email de contact de l'employeur (fourni par certaines offres France Travail seulement).
  // Quand présent → on peut proposer « Postuler depuis Joboost » (envoi par email, sans redirection).
  contactEmail?: string;
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

// ====================================================================
//  Géolocalisation précise — résout une localisation libre en code commune
//  INSEE (via l'API Géo gouv, gratuite et sans clé), pour filtrer les offres
//  France Travail par COMMUNE + RAYON au lieu du département entier.
//  Dégradation propre : commune → département → aucun filtre.
// ====================================================================
const GEO_API = 'https://geo.api.gouv.fr/communes';

interface ResolvedLocation { commune?: string; departement?: string }

const resolveLocation = async (location: string): Promise<ResolvedLocation> => {
  const loc = (location || '').trim();
  if (!loc) return {};
  const depFallback = extractDepartement(loc);
  try {
    // 1. Code postal explicite (5 chiffres) → commune précise
    const cp = loc.match(/\b(\d{5})\b/);
    if (cp) {
      const res = await fetch(`${GEO_API}?codePostal=${cp[1]}&fields=code,nom,codeDepartement&format=json`);
      if (res.ok) {
        const arr: any[] = await res.json();
        if (Array.isArray(arr) && arr.length) {
          // Plusieurs communes peuvent partager un code postal : on privilégie celle dont
          // le nom correspond au texte fourni, sinon la première.
          const cityName = loc.replace(/\d/g, '').trim().toLowerCase();
          const hit = cityName ? arr.find((c) => (c.nom || '').toLowerCase() === cityName) : undefined;
          const chosen = hit || arr[0];
          return { commune: chosen.code, departement: chosen.codeDepartement || depFallback };
        }
      }
    }
    // 2. Sinon, nom de ville → commune la plus peuplée portant ce nom
    const cityName = loc.replace(/\d+/g, '').trim();
    if (cityName.length >= 2 && cityName.toLowerCase() !== 'france') {
      const res = await fetch(`${GEO_API}?nom=${encodeURIComponent(cityName)}&fields=code,codeDepartement&boost=population&limit=1&format=json`);
      if (res.ok) {
        const arr: any[] = await res.json();
        if (Array.isArray(arr) && arr.length) {
          return { commune: arr[0].code, departement: arr[0].codeDepartement || depFallback };
        }
      }
    }
  } catch (e: any) {
    console.error('Résolution commune (geo.api.gouv.fr) échouée, repli département :', e?.message || e);
  }
  return { departement: depFallback };
};

// Applique le meilleur filtre géographique disponible aux paramètres de recherche FT.
const applyGeoParams = async (params: URLSearchParams, location: string, distanceKm = 30): Promise<void> => {
  const { commune, departement } = await resolveLocation(location);
  if (commune) {
    params.set('commune', commune);
    params.set('distance', String(distanceKm)); // rayon en km autour de la commune
  } else if (departement) {
    params.set('departement', departement);
  }
};

export const franceTravailService = {
  /**
   * Recherche de vraies offres et regroupement par entreprise recruteuse.
   * Renvoie des "cartes entreprise" pour la candidature spontanée.
   */
  searchCompanies: async (jobTitle: string, location: string, max = 15, distanceKm = 30): Promise<FtCompany[]> => {
    const token = await getFtToken();

    const params = new URLSearchParams();
    if (jobTitle) params.set('motsCles', jobTitle);
    await applyGeoParams(params, location, distanceKm);
    params.set('range',`0-${Math.max(0, max - 1)}`);

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
  searchOffers: async (jobTitle: string, location: string, max = 15, distanceKm = 30, contractType?: string): Promise<FtOffer[]> => {
    const token = await getFtToken();

    const params = new URLSearchParams();
    if (jobTitle) params.set('motsCles', jobTitle);
    await applyGeoParams(params, location, distanceKm);
    // Filtre contrat. La plupart des codes sont des `typeContrat` France Travail
    // (CDI, CDD, MIS=intérim, SAI=saisonnier, DIN=CDI intérimaire, DDI/TTI=insertion,
    // CCE/LIB/FRA/REP=indépendant). L'ALTERNANCE est à part : E2 (apprentissage) et
    // FS (professionnalisation) sont des `natureContrat` dans l'API.
    if (contractType === 'E2' || contractType === 'FS') params.set('natureContrat', contractType);
    else if (contractType) params.set('typeContrat', contractType);
    params.set('range',`0-${Math.max(0, max - 1)}`);

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

      // Description complète de l'offre (nettoyée), sinon message générique.
      // On envoie le texte intégral : le front l'affiche replié avec un « Voir plus ».
      const rawDesc: string = (o?.description || '').replace(/\s+/g, ' ').trim();
      const aiInsight = rawDesc
        || `Offre publiée sur France Travail correspondant à votre recherche « ${jobTitle} ».`;

      return {
        id: `ft_${o.id}`,
        title: o?.intitule || jobTitle,
        company: o?.entreprise?.nom?.trim() || 'Entreprise confidentielle',
        location: o?.lieuTravail?.libelle || location || 'France',
        salary: o?.salaire?.libelle?.trim() || 'Salaire non précisé',
        type: o?.typeContratLibelle || o?.natureContrat || 'Contrat à préciser',
        // FT renvoie les résultats par pertinence : on dérive un score décroissant et étalé
        // (96 → ~62) pour rester lisible même avec beaucoup d'offres.
        matchScore: Math.round(Math.max(62, 96 - index * 1.1)),
        postedDate: relativeDate(o?.dateCreation),
        source: 'France Travail',
        url: o?.origineOffre?.urlOrigine || '',
        tags,
        aiInsight,
        // Email de contact employeur : champ structuré (rare), sinon coordonnées,
        // sinon email écrit en clair dans la description → maximise les offres « postables ».
        contactEmail: extractContactEmail(
          o?.contact?.courriel,
          o?.contact?.coordonnees1, o?.contact?.coordonnees2, o?.contact?.coordonnees3,
          rawDesc,
        ),
      };
    });
  },

  /**
   * Résout le code ROME dominant pour un métier + lieu via l'API Offres (déjà autorisée).
   * Sert d'entrée à La Bonne Boîte (qui exige un code ROME, pas du texte libre).
   */
  resolveRomeCode: async (jobTitle: string, location: string, distanceKm = 30): Promise<string | undefined> => {
    const token = await getFtToken();
    const params = new URLSearchParams();
    if (jobTitle) params.set('motsCles', jobTitle);
    await applyGeoParams(params, location, distanceKm);
    params.set('range','0-24');

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
