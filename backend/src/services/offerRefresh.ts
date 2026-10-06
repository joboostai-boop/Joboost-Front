// ====================================================================
//  Rafraîchissement quotidien de la base d'offres Joboost.
//
//  Pour chaque candidat qui a renseigné un métier et une ville, on remet à jour
//  sa recherche par défaut (France Travail + Adzuna, 30 km, tous contrats) si elle
//  date de plus de 20 h. Ainsi, quand il ouvre la page Offres, tout est déjà
//  dans notre base : réponse immédiate, même juste après un redémarrage du serveur.
//  Appels faits un par un, avec une courte pause, pour ménager les API sources.
// ====================================================================
import { prisma } from '../db';
import { franceTravailService, isFranceTravailConfigured } from './francetravail.service';
import { adzunaService, isAdzunaConfigured } from './adzuna.service';
import { offerStore, OfferSearchSpec } from './offerStore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let running = false;

export const refreshActiveUsersOffers = async (): Promise<{ users: number; refreshed: number; skipped: number; failed: number }> => {
  if (running) return { users: 0, refreshed: 0, skipped: 0, failed: 0 };
  running = true;
  const stats = { users: 0, refreshed: 0, skipped: 0, failed: 0 };
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'BUSINESS_PARTNER' }, title: { not: null }, city: { not: null } },
      select: { title: true, city: true, postalCode: true },
    });
    // Plusieurs candidats peuvent partager métier + ville : une seule recherche.
    const searches = new Map<string, { title: string; location: string }>();
    for (const u of users) {
      const title = (u.title || '').trim();
      const location = [u.city, u.postalCode].filter(Boolean).join(' ').trim();
      if (title && location) searches.set(`${title}|${location}`.toLowerCase(), { title, location });
    }
    stats.users = users.length;

    for (const { title, location } of searches.values()) {
      const jobs: [OfferSearchSpec, () => Promise<any>][] = [];
      if (isFranceTravailConfigured()) jobs.push([{ source: 'ft', query: title, location, radius: 30 }, () => franceTravailService.searchOffers(title, location, 300, 30)]);
      if (isAdzunaConfigured()) jobs.push([{ source: 'adz', query: title, location, radius: 30 }, () => adzunaService.searchOffers(title, location, 100, 30)]);
      for (const [spec, fetcher] of jobs) {
        const last = await offerStore.lastFetched(spec);
        if (last && Date.now() - last.getTime() < 20 * 3600_000) { stats.skipped++; continue; }
        try {
          await offerStore.refresh(spec, fetcher);
          stats.refreshed++;
        } catch (e: any) {
          stats.failed++;
          console.warn('[offerRefresh] échec', spec.source, title, location, '—', e?.message || e);
        }
        await sleep(400);
      }
    }
    const purged = await offerStore.purge();
    console.log(`[offerRefresh] ${stats.refreshed} recherches rafraîchies, ${stats.skipped} déjà à jour, ${stats.failed} échecs ; purge : ${purged.searches} recherches, ${purged.offers} offres`);
  } catch (e: any) {
    console.error('[offerRefresh] interrompu :', e?.message || e);
  } finally {
    running = false;
  }
  return stats;
};

/** Lance le rafraîchissement 2 min après le démarrage, puis toutes les 24 h. */
export const scheduleOfferRefresh = () => {
  if (process.env.OFFER_REFRESH === 'off') return;
  setTimeout(() => { refreshActiveUsersOffers(); }, 2 * 60_000);
  setInterval(() => { refreshActiveUsersOffers(); }, 24 * 3600_000);
};
