import dotenv from 'dotenv';
dotenv.config();

import type { FtOffer } from './francetravail.service';

// ====================================================================
//  Service Adzuna — agrégateur d'offres d'emploi (complète France Travail).
//  API officielle, gratuite avec un app_id + app_key (developer.adzuna.com).
//  On mappe les résultats vers le MÊME format `FtOffer` que France Travail
//  pour que le front les affiche sans distinction.
//
//  Dégradation propre : si les clés ne sont pas configurées, isAdzunaConfigured()
//  renvoie false et l'appelant n'interroge tout simplement pas Adzuna.
//  Doc : https://developer.adzuna.com/
// ====================================================================

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
// Pays Adzuna (fr = France). Modifiable via env si besoin.
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || 'fr';
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';

export const isAdzunaConfigured = (): boolean => Boolean(ADZUNA_APP_ID && ADZUNA_APP_KEY);

// Met en forme une date ISO en libellé relatif FR (aligné sur le service France Travail).
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

// Formate une fourchette de salaire Adzuna (annuel) en libellé lisible.
const formatSalary = (min?: number, max?: number): string => {
  const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)} / an`;
  if (min) return `${fmt(min)} / an`;
  if (max) return `${fmt(max)} / an`;
  return 'Salaire non précisé';
};

// Traduit le type de contrat interne (codes France Travail) vers les filtres Adzuna.
// Adzuna ne distingue que permanent / contract (+ temps plein/partiel) → on ne mappe
// que ce qui a un équivalent fiable, sinon aucun filtre (on laisse Adzuna tout renvoyer).
const adzunaContractParam = (contractType?: string): Record<string, string> => {
  switch (contractType) {
    case 'CDI': return { contract_type: 'permanent' };
    case 'CDD': return { contract_type: 'contract' };
    default: return {};
  }
};

export const adzunaService = {
  /**
   * Recherche d'offres Adzuna, mappées au format `FtOffer` (commun au front).
   * @param what       mots-clés (métier)
   * @param where      localisation libre (ville)
   * @param max        nombre d'offres souhaité
   * @param distanceKm rayon de recherche autour de `where`
   * @param contractType code interne (CDI/CDD/…) — filtré côté Adzuna quand possible
   */
  searchOffers: async (what: string, where: string, max = 20, distanceKm = 30, contractType?: string): Promise<FtOffer[]> => {
    if (!isAdzunaConfigured()) return [];

    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: String(Math.min(50, Math.max(1, max))),
      'content-type': 'application/json',
    });
    if (what) params.set('what', what);
    if (where) { params.set('where', where); params.set('distance', String(distanceKm)); }
    for (const [k, v] of Object.entries(adzunaContractParam(contractType))) params.set(k, v);

    const url = `${ADZUNA_BASE}/${ADZUNA_COUNTRY}/search/1?${params.toString()}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Adzuna search error ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const results: any[] = Array.isArray(json?.results) ? json.results : [];

    return results.map((o, index): FtOffer => {
      const rawDesc: string = (o?.description || '').replace(/\s+/g, ' ').trim();
      const category = o?.category?.label;
      const tags = category ? [String(category)] : [];

      return {
        id: `adz_${o?.id || index}`,
        title: o?.title?.replace(/<\/?[^>]+>/g, '').trim() || what,
        company: o?.company?.display_name?.trim() || 'Entreprise non précisée',
        location: o?.location?.display_name || where || 'France',
        salary: formatSalary(o?.salary_min, o?.salary_max),
        type: o?.contract_time === 'part_time' ? 'Temps partiel'
            : o?.contract_type === 'permanent' ? 'CDI'
            : o?.contract_type === 'contract' ? 'CDD'
            : 'Contrat à préciser',
        // Score décroissant et étalé (94 → ~60), légèrement sous France Travail (source nationale prioritaire).
        matchScore: Math.round(Math.max(60, 94 - index * 1.2)),
        postedDate: relativeDate(o?.created),
        source: 'Adzuna',
        url: o?.redirect_url || '',
        tags,
        aiInsight: rawDesc
          ? `${rawDesc.slice(0, 600)}${rawDesc.length > 600 ? '…' : ''}`
          : `Offre publiée via Adzuna correspondant à votre recherche « ${what} ».`,
      };
    });
  },
};
