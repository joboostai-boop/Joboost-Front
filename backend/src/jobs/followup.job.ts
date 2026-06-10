import { prisma } from '../db';
import { emailService, isEmailConfigured } from '../services/email.service';
import { pdfService } from '../services/pdf.service';
import { FOLLOW_UP_DELAY_DAYS, MAX_FOLLOW_UPS } from '../controllers/spontaneous.controller';

// ====================================================================
//  Job de relance des candidatures spontanées.
//
//  Sélectionne les candidatures ENVOYÉES dont la relance est due, puis :
//   - relance AUTOMATIQUEMENT uniquement si AUTO_SAFE ET l'utilisateur a activé
//     l'envoi automatique (autoSendEnabled). Sinon, on laisse `followUpAt` :
//     l'UI signale "relance à faire" et l'utilisateur déclenche manuellement.
//
//  Garde-fous : jamais de relance si réponse reçue, bounce, ou max atteint.
//
//  Déclenchement :
//   - en process : setInterval activé par ENABLE_FOLLOWUP_CRON=true (voir index.ts),
//   - ou en externe : `npm run job:followup` (cron de l'hébergeur).
// ====================================================================

export interface FollowUpReport {
  due: number;
  sent: number;
  skipped: number;
  failed: number;
}

export const runFollowUpJob = async (): Promise<FollowUpReport> => {
  const now = new Date();
  const report: FollowUpReport = { due: 0, sent: 0, skipped: 0, failed: 0 };

  const dueItems = await prisma.spontaneousApplication.findMany({
    where: {
      status: { in: ['SENT', 'FOLLOWED_UP'] },
      followUpAt: { not: null, lte: now },
      followUpCount: { lt: MAX_FOLLOW_UPS },
      repliedAt: null,
      bouncedAt: null,
    },
  });
  report.due = dueItems.length;

  if (!isEmailConfigured()) {
    // Pas d'envoi possible : on laisse les candidatures en l'état pour relance manuelle.
    report.skipped = dueItems.length;
    return report;
  }

  for (const sp of dueItems) {
    // Conditions d'auto-relance strictes.
    if (sp.autoLevel !== 'AUTO_SAFE' || !sp.contactEmail) {
      report.skipped++;
      continue;
    }
    const user = await prisma.user.findUnique({ where: { id: sp.userId } });
    if (!user || !user.autoSendEnabled) {
      report.skipped++;
      continue;
    }

    let attachments;
    try {
      const cv = await pdfService.cvPdf(user);
      attachments = [{ filename: 'CV.pdf', content: cv.toString('base64') }];
    } catch { attachments = undefined; }

    const result = await emailService.sendSpontaneous({
      senderName: user.name,
      replyTo: user.email,
      to: sp.contactEmail,
      companyName: sp.companyName,
      jobTitle: sp.jobTitle,
      bodyText: `Bonjour,\n\nJe me permets de revenir vers vous concernant ma candidature spontanée pour un poste de ${sp.jobTitle}. Je reste très intéressé(e) et disponible pour en échanger.\n\nCordialement,\n${user.name}`,
      attachments,
    });

    if (!result.sent) {
      report.failed++;
      continue; // on retentera au prochain passage (followUpAt inchangé)
    }

    const nextCount = sp.followUpCount + 1;
    // Replanifie une 2e relance si le quota le permet, sinon clôt le cycle de relance.
    const nextFollowUpAt =
      nextCount < MAX_FOLLOW_UPS ? new Date(Date.now() + FOLLOW_UP_DELAY_DAYS * 24 * 3600 * 1000) : null;

    await prisma.spontaneousApplication.update({
      where: { id: sp.id },
      data: {
        status: 'FOLLOWED_UP',
        followUpCount: { increment: 1 },
        lastFollowUpAt: now,
        followUpAt: nextFollowUpAt,
      },
    });
    report.sent++;
  }

  return report;
};

// Exécution standalone : `npm run job:followup`
if (require.main === module) {
  runFollowUpJob()
    .then((r) => {
      console.log('[followup] terminé :', r);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[followup] erreur :', e);
      process.exit(1);
    });
}
