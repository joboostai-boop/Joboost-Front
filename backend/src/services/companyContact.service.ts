import { prisma } from '../db';

// ====================================================================
//  Base d'emails d'entreprise PARTAGÉE (« une bonne fois pour toutes »).
//  Chaque email trouvé une fois (offre / détecteur / ajout manuel candidat)
//  est stocké et réutilisé pour tous les candidats. Clé = nom normalisé +
//  code postal (limite les homonymes entre villes). Best-effort : ne bloque
//  jamais le flux appelant.
// ====================================================================

const normalize = (s: string): string =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const postalFrom = (location?: string): string => {
  const m = (location || '').match(/\b(\d{5})\b/);
  return m ? m[1] : '';
};

const keyFor = (name: string, location?: string): string => `${normalize(name)}|${postalFrom(location)}`;

export interface KnownContact { email: string; domain: string | null; verifiedMx: boolean; }

export const companyContactService = {
  keyFor,

  /** Email connu pour cette entreprise (incrémente le compteur d'usage). null si inconnu. */
  lookup: async (name: string, location?: string): Promise<KnownContact | null> => {
    if (!name) return null;
    try {
      const hit = await prisma.companyContact.findUnique({ where: { companyKey: keyFor(name, location) } });
      if (!hit) return null;
      // compteur d'usage en fire-and-forget (ne bloque pas la lecture)
      prisma.companyContact.update({ where: { id: hit.id }, data: { usageCount: { increment: 1 } } }).catch(() => {});
      return { email: hit.email, domain: hit.domain, verifiedMx: hit.verifiedMx };
    } catch {
      return null;
    }
  },

  /** Version groupée de `lookup` : une seule requête pour toute une liste d'entreprises.
   *  Renvoie une Map clé → contact (clé = keyFor(nom, lieu)). */
  lookupMany: async (items: { name: string; location?: string }[]): Promise<Map<string, KnownContact>> => {
    const out = new Map<string, KnownContact>();
    const keys = Array.from(new Set(items.filter((i) => i.name).map((i) => keyFor(i.name, i.location))));
    if (!keys.length) return out;
    try {
      const rows = await prisma.companyContact.findMany({ where: { companyKey: { in: keys } } });
      for (const r of rows) out.set(r.companyKey, { email: r.email, domain: r.domain, verifiedMx: r.verifiedMx });
    } catch {
      /* best-effort */
    }
    return out;
  },

  /** Enregistre/met à jour un email d'entreprise dans la base partagée. Best-effort. */
  save: async (
    name: string,
    email: string,
    opts: { location?: string; domain?: string; source?: string; verifiedMx?: boolean } = {},
  ): Promise<void> => {
    if (!name || !email || !email.includes('@')) return;
    try {
      const key = keyFor(name, opts.location);
      const lower = email.toLowerCase();
      await prisma.companyContact.upsert({
        where: { companyKey: key },
        create: {
          companyKey: key,
          companyName: name,
          email: lower,
          domain: opts.domain || null,
          postalCode: postalFrom(opts.location) || null,
          source: opts.source || 'manual',
          verifiedMx: Boolean(opts.verifiedMx),
        },
        update: {
          email: lower,
          ...(opts.domain ? { domain: opts.domain } : {}),
          ...(opts.verifiedMx !== undefined ? { verifiedMx: opts.verifiedMx } : {}),
        },
      });
    } catch {
      /* best-effort : jamais bloquant */
    }
  },
};
