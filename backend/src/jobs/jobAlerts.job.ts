import { prisma } from '../db';
import { emailService, isEmailConfigured, JobAlertOffer } from '../services/email.service';
import { franceTravailService, isFranceTravailConfigured, FtOffer } from '../services/francetravail.service';
import { adzunaService, isAdzunaConfigured } from '../services/adzuna.service';

// ====================================================================
//  Job d'alertes emploi par email.
//
//  Pour chaque utilisateur ayant activé les alertes (jobAlertOptIn) et dont la
//  fréquence est due (quotidienne / hebdomadaire), on cherche des offres réelles
//  (France Travail + Adzuna) sur son profil et on lui envoie une sélection.
//
//  Tout est guardé : sans Resend ou sans source d'offres configurée, on n'envoie rien.
//
//  Déclenchement :
//   - en process : setInterval activé par ENABLE_JOB_ALERTS_CRON=true (voir index.ts),
//   - ou en externe : `npm run job:alerts` (cron de l'hébergeur).
// ====================================================================

export interface JobAlertReport {
  candidates: number;
  due: number;
  sent: number;
  skipped: number;
  failed: number;
}

// Fréquence respectée : on tolère une petite marge pour ne pas rater un passage.
const isDue = (frequency: string | null, lastSentAt: Date | null): boolean => {
  if (!lastSentAt) return true;
  const elapsedH = (Date.now() - lastSentAt.getTime()) / (3600 * 1000);
  return frequency === 'weekly' ? elapsedH >= 24 * 7 - 2 : elapsedH >= 23;
};

const dedupe = (offers: FtOffer[]): FtOffer[] => {
  const seen = new Set<string>();
  const out: FtOffer[] = [];
  for (const o of offers) {
    const key = `${(o.title || '').toLowerCase().trim()}|${(o.company || '').toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
};

export const runJobAlertsJob = async (): Promise<JobAlertReport> => {
  const report: JobAlertReport = { candidates: 0, due: 0, sent: 0, skipped: 0, failed: 0 };

  if (!isEmailConfigured() || (!isFranceTravailConfigured() && !isAdzunaConfigured())) {
    return report; // rien à faire sans email ni source d'offres
  }

  const users = await prisma.user.findMany({
    where: { jobAlertOptIn: true, email: { not: '' } },
  });
  report.candidates = users.length;

  for (const user of users) {
    if (!isDue(user.jobAlertFrequency, user.jobAlertLastSentAt)) {
      report.skipped++;
      continue;
    }
    report.due++;

    const title = user.title || 'Emploi';
    const location = [user.city, (user as any).postalCode].filter(Boolean).join(' ').trim() || user.city || 'France';

    try {
      const tasks: Promise<FtOffer[]>[] = [];
      if (isFranceTravailConfigured()) {
        tasks.push(franceTravailService.searchOffers(title, location, 20, 30).catch(() => [] as FtOffer[]));
      }
      if (isAdzunaConfigured()) {
        tasks.push(adzunaService.searchOffers(title, location, 15, 30).catch(() => [] as FtOffer[]));
      }
      const merged = dedupe((await Promise.all(tasks)).flat())
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 8);

      if (merged.length === 0) {
        report.skipped++;
        continue;
      }

      const offers: JobAlertOffer[] = merged.map((o) => ({
        title: o.title, company: o.company, location: o.location, salary: o.salary, type: o.type, url: o.url,
      }));

      const result = await emailService.sendJobAlert({
        to: user.email,
        name: user.name,
        offers,
        frequency: user.jobAlertFrequency === 'weekly' ? 'weekly' : 'daily',
      });

      if (!result.sent) {
        report.failed++;
        continue; // on retentera au prochain passage (jobAlertLastSentAt inchangé)
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { jobAlertLastSentAt: new Date() },
      });
      report.sent++;
    } catch (e: any) {
      console.error('[jobAlerts] erreur utilisateur', user.id, e?.message || e);
      report.failed++;
    }
  }

  return report;
};

// Exécution standalone : `npm run job:alerts`
if (require.main === module) {
  runJobAlertsJob()
    .then((r) => { console.log('[jobAlerts] terminé :', r); process.exit(0); })
    .catch((e) => { console.error('[jobAlerts] erreur :', e); process.exit(1); });
}
