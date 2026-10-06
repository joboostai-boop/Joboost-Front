// ====================================================================
//  Base d'offres Joboost (progressive) — lecture/écriture.
//
//  Avant : chaque ouverture de la page Offres interrogeait France Travail et
//  Adzuna en direct (~1,3 s, davantage quand une source rame).
//  Maintenant, pour une recherche donnée (source + métier + lieu + rayon + contrat) :
//    1. mémoire du serveur (15 min)                 → instantané
//    2. sinon notre base (table OfferSearch/JobOffer) :
//         - fraîche (< 6 h)  → on répond avec la base
//         - ancienne (< 7 j) → on répond avec la base ET on rafraîchit en arrière-plan
//    3. sinon la source en direct, puis on enregistre le résultat dans la base.
//  Une panne de la base ne casse jamais la page : on retombe sur la source en direct.
// ====================================================================
import { prisma } from '../db';
import type { FtOffer } from './francetravail.service';
import { TtlCache } from './ttlCache';

const FRESH_MS = 6 * 3600_000;
const MAX_STALE_MS = 7 * 24 * 3600_000;

const memory = new TtlCache<FtOffer[]>(15 * 60_000, 800);
const refreshing = new Set<string>();

export interface OfferSearchSpec {
  source: 'ft' | 'adz';
  query: string;
  location: string;
  radius: number;
  contract?: string;
}

export const searchKey = (s: OfferSearchSpec) =>
  `${s.source}|${s.query}|${s.location}|${s.radius}|${s.contract || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();

// « Il y a 3 jours » recalculé au moment de la lecture (une offre stockée vieillit).
const relativeDate = (iso?: string | null, fallback = 'Récemment'): string => {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return fallback;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return d.toLocaleDateString('fr-FR');
};

// « 69 - Lyon 3e » → « 69 » (France Travail préfixe la plupart des lieux par le département).
const departementOf = (location: string): string | null => {
  const m = (location || '').match(/^\s*(\d{2,3}|2[AB])\s*-/i);
  return m ? m[1].toUpperCase() : null;
};

const toDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

/** Enregistre les offres et la recherche qui les a renvoyées. Ne lève jamais.
 *  `keepIfEmpty` : lors d'un RAFRAÎCHISSEMENT, une réponse vide (souvent une panne
 *  passagère de la source) ne doit pas effacer une recherche qui avait des offres. */
const persist = async (spec: OfferSearchSpec, offers: FtOffer[], keepIfEmpty = false): Promise<void> => {
  try {
    const unique = Array.from(new Map(offers.filter((o) => o?.id).map((o) => [o.id, o])).values());
    if (keepIfEmpty && unique.length === 0) {
      const existing = await prisma.offerSearch.findUnique({ where: { key: searchKey(spec) }, select: { offerIds: true } });
      if (existing && existing.offerIds.length > 0) return;
    }
    if (unique.length) {
      // Insertion groupée (une requête) ; les offres déjà connues sont ignorées…
      await prisma.jobOffer.createMany({
        skipDuplicates: true,
        data: unique.map((o) => ({
          id: o.id,
          source: o.source,
          title: o.title,
          company: o.company,
          location: o.location,
          departement: departementOf(o.location),
          postedAt: toDate(o.postedAt),
          // Texte limité à 1 500 caractères : divise la place prise par ~2 ; le lien
          // vers l'annonce complète reste dans l'offre.
          payload: { ...o, aiInsight: (o.aiInsight || '').slice(0, 1500) } as any,
        })),
      });
      // … puis on marque celles-ci comme revues aujourd'hui (sert à la purge).
      await prisma.jobOffer.updateMany({ where: { id: { in: unique.map((o) => o.id) } }, data: { fetchedAt: new Date() } });
    }
    const now = new Date();
    await prisma.offerSearch.upsert({
      where: { key: searchKey(spec) },
      create: { key: searchKey(spec), source: spec.source, query: spec.query, location: spec.location, radius: spec.radius, contract: spec.contract || null, offerIds: unique.map((o) => o.id), fetchedAt: now, lastUsedAt: now },
      update: { offerIds: unique.map((o) => o.id), fetchedAt: now, lastUsedAt: now },
    });
  } catch (e: any) {
    console.error('[offerStore] enregistrement impossible :', e?.message || e);
  }
};

/** Relit une recherche depuis la base. null = inconnue ou trop ancienne. */
const readFromDb = async (spec: OfferSearchSpec): Promise<{ offers: FtOffer[]; fresh: boolean } | null> => {
  try {
    const search = await prisma.offerSearch.findUnique({ where: { key: searchKey(spec) } });
    if (!search) return null;
    const age = Date.now() - search.fetchedAt.getTime();
    if (age > MAX_STALE_MS) return null;
    const rows = await prisma.jobOffer.findMany({ where: { id: { in: search.offerIds } } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const offers = search.offerIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((r) => {
        const o = r!.payload as unknown as FtOffer;
        return { ...o, postedDate: relativeDate(o.postedAt, o.postedDate) };
      });
    prisma.offerSearch.update({ where: { key: search.key }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return { offers, fresh: age < FRESH_MS };
  } catch (e: any) {
    console.error('[offerStore] lecture impossible, repli sur la source :', e?.message || e);
    return null;
  }
};

const refreshInBackground = (spec: OfferSearchSpec, fetcher: () => Promise<FtOffer[]>) => {
  const key = searchKey(spec);
  if (refreshing.has(key)) return;
  refreshing.add(key);
  fetcher()
    .then(async (offers) => { await persist(spec, offers, true); if (offers.length) memory.set(key, offers); })
    .catch((e) => console.warn('[offerStore] rafraîchissement échoué :', e?.message || e))
    .finally(() => refreshing.delete(key));
};

export const offerStore = {
  /**
   * Offres pour une recherche, depuis la mémoire, notre base, ou la source en direct
   * (`fetcher`), dans cet ordre. Lève seulement si la source échoue ET que rien n'est stocké.
   */
  get: (spec: OfferSearchSpec, fetcher: () => Promise<FtOffer[]>): Promise<FtOffer[]> =>
    memory.get(searchKey(spec), async () => {
      const stored = await readFromDb(spec);
      if (stored) {
        if (!stored.fresh) refreshInBackground(spec, fetcher);
        return stored.offers;
      }
      const live = await fetcher();
      persist(spec, live); // en arrière-plan : la réponse n'attend pas l'écriture
      return live;
    }),

  /** Force l'interrogation de la source et l'enregistrement (rafraîchissement quotidien). */
  refresh: async (spec: OfferSearchSpec, fetcher: () => Promise<FtOffer[]>): Promise<number> => {
    const live = await fetcher();
    await persist(spec, live, true);
    if (live.length) memory.set(searchKey(spec), live);
    return live.length;
  },

  /** Date de dernière interrogation d'une recherche (null si jamais faite). */
  lastFetched: async (spec: OfferSearchSpec): Promise<Date | null> => {
    const s = await prisma.offerSearch.findUnique({ where: { key: searchKey(spec) }, select: { fetchedAt: true } }).catch(() => null);
    return s?.fetchedAt || null;
  },

  /** Ménage : recherches inutilisées depuis 30 j, offres non revues depuis 45 j. */
  purge: async (): Promise<{ searches: number; offers: number }> => {
    const searches = await prisma.offerSearch.deleteMany({ where: { lastUsedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } });
    const offers = await prisma.jobOffer.deleteMany({ where: { fetchedAt: { lt: new Date(Date.now() - 45 * 86_400_000) } } });
    return { searches: searches.count, offers: offers.count };
  },
};
