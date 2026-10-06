// ====================================================================
//  Campagne de candidatures spontanées : file d'envoi depuis la boîte du candidat.
//
//  Règles d'envoi (protègent la boîte du candidat du classement en spam) :
//   - une candidature à la fois, au moins SPACING_MIN minutes entre deux envois ;
//   - au plus `dailyLimit` envois par jour (12 par défaut) ;
//   - seulement aux heures de bureau, heure de Paris (8 h 30 – 19 h, lundi–samedi).
//  Rien ne part sans validation : seules les candidatures que le candidat a
//  explicitement mises dans la file (POST /spontaneous/:id/queue) sont envoyées.
// ====================================================================
import { prisma } from '../db';
import { mailboxService } from './mailbox.service';
import { pdfService } from './pdf.service';

export const SPACING_MIN = 25;
const FOLLOW_UP_DELAY_DAYS = 12;

// Heure de Paris (jour 0 = dimanche, minutes depuis minuit).
const parisClock = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  return { day: days.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
};
export const isSendingWindow = (d = new Date()) => {
  const { day, minutes } = parisClock(d);
  return day >= 1 && day <= 6 && minutes >= 8 * 60 + 30 && minutes < 19 * 60;
};
const startOfParisDay = (d = new Date()) => {
  const { minutes } = parisClock(d);
  return new Date(d.getTime() - minutes * 60_000 - d.getSeconds() * 1000 - d.getMilliseconds());
};

export const campaignService = {
  /** Envois déjà faits aujourd'hui (heure de Paris) depuis la boîte du candidat. */
  sentToday: (userId: string) =>
    prisma.outboxItem.count({ where: { userId, status: 'SENT', sentAt: { gte: startOfParisDay() } } }),

  /** Met une candidature validée dans la file. Le texte de la lettre validé est enregistré. */
  queue: async (userId: string, spontaneousId: string, coverLetterText?: string) => {
    const sp = await prisma.spontaneousApplication.findUnique({ where: { id: spontaneousId } });
    if (!sp || sp.userId !== userId) throw Object.assign(new Error('Candidature introuvable.'), { status: 404 });
    if (['SENT', 'SENDING', 'FOLLOWED_UP', 'REPLIED'].includes(sp.status)) throw Object.assign(new Error('Candidature déjà envoyée.'), { status: 409 });
    if (!sp.contactEmail) throw Object.assign(new Error("Pas d'adresse e-mail pour cette entreprise."), { status: 422 });
    const box = await prisma.mailboxConnection.findUnique({ where: { userId } });
    if (!box || box.status !== 'ACTIVE') throw Object.assign(new Error('Connecte ta boîte mail pour envoyer depuis ton adresse.'), { status: 412 });
    const text = (coverLetterText ?? sp.coverLetterText ?? '').trim();
    if (text.length < 80) throw Object.assign(new Error('La lettre est trop courte pour être envoyée.'), { status: 422 });

    await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { coverLetterText: text, status: 'READY' } });
    return prisma.outboxItem.upsert({
      where: { spontaneousId: sp.id },
      create: { userId, spontaneousId: sp.id, scheduledAt: new Date() },
      update: { status: 'QUEUED', scheduledAt: new Date(), lastError: null },
    });
  },

  cancel: async (userId: string, spontaneousId: string) => {
    await prisma.outboxItem.updateMany({ where: { userId, spontaneousId, status: 'QUEUED' }, data: { status: 'CANCELLED' } });
  },

  /** Résumé pour l'écran Campagne. */
  overview: async (userId: string) => {
    const [mailbox, sentToday, queued] = await Promise.all([
      mailboxService.status(userId),
      campaignService.sentToday(userId),
      prisma.outboxItem.findMany({ where: { userId, status: 'QUEUED' }, orderBy: { createdAt: 'asc' }, select: { spontaneousId: true } }),
    ]);
    const limit = mailbox.connected ? mailbox.dailyLimit : 12;
    // Estimation : envois restants aujourd'hui, puis jours suivants au même rythme.
    const remainingToday = Math.max(0, limit - sentToday);
    const daysNeeded = queued.length <= remainingToday ? 0 : Math.ceil((queued.length - remainingToday) / limit);
    return {
      mailbox,
      sentToday,
      dailyLimit: limit,
      queuedIds: queued.map((q) => q.spontaneousId),
      spacingMinutes: SPACING_MIN,
      inSendingWindow: isSendingWindow(),
      estimatedDays: daysNeeded,
    };
  },

  /**
   * Un passage du facteur : pour chaque candidat ayant des envois en attente,
   * envoie AU PLUS UNE candidature si les règles le permettent.
   */
  tick: async (): Promise<{ sent: number; failed: number; waiting: number }> => {
    const stats = { sent: 0, failed: 0, waiting: 0 };
    if (!isSendingWindow()) return stats;
    const due = await prisma.outboxItem.findMany({ where: { status: 'QUEUED', scheduledAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' } });
    const firstByUser = new Map<string, typeof due[number]>();
    for (const item of due) if (!firstByUser.has(item.userId)) firstByUser.set(item.userId, item);

    for (const item of firstByUser.values()) {
      const box = await prisma.mailboxConnection.findUnique({ where: { userId: item.userId } });
      if (!box || box.status !== 'ACTIVE') { stats.waiting++; continue; }
      if (box.lastSentAt && Date.now() - box.lastSentAt.getTime() < SPACING_MIN * 60_000) { stats.waiting++; continue; }
      if ((await campaignService.sentToday(item.userId)) >= box.dailyLimit) { stats.waiting++; continue; }

      const sp = await prisma.spontaneousApplication.findUnique({ where: { id: item.spontaneousId } });
      const user = await prisma.user.findUnique({ where: { id: item.userId } });
      if (!sp || !user || !sp.contactEmail || !sp.coverLetterText) {
        await prisma.outboxItem.update({ where: { id: item.id }, data: { status: 'FAILED', lastError: 'Candidature incomplète.' } });
        stats.failed++;
        continue;
      }
      try {
        await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { status: 'SENDING' } });
        const attachments: { filename: string; content: string }[] = [];
        try { attachments.push({ filename: `CV-${user.name.replace(/\s+/g, '-')}.pdf`, content: (await pdfService.cvPdf(user)).toString('base64') }); }
        catch (e: any) { console.error('[campagne] PDF du CV impossible :', e?.message || e); }

        const { messageId } = await mailboxService.send(user.id, user.name, {
          to: sp.contactEmail,
          subject: `Candidature spontanée — ${sp.jobTitle}`,
          text: sp.coverLetterText,
          attachments,
        });
        const now = new Date();
        await prisma.spontaneousApplication.update({
          where: { id: sp.id },
          data: { status: 'SENT', sentAt: now, messageId, followUpAt: new Date(now.getTime() + FOLLOW_UP_DELAY_DAYS * 86_400_000) },
        });
        if (sp.applicationId) await prisma.application.update({ where: { id: sp.applicationId }, data: { status: 'SENT' } });
        await prisma.outboxItem.update({ where: { id: item.id }, data: { status: 'SENT', sentAt: now, attempts: { increment: 1 } } });
        stats.sent++;
      } catch (e: any) {
        const attempts = item.attempts + 1;
        // Identifiants refusés : on met la file en pause (le candidat doit reconnecter sa boîte).
        // Autre erreur : on réessaie plus tard, 3 fois au plus.
        const giveUp = !e?.auth && attempts >= 3;
        await prisma.outboxItem.update({
          where: { id: item.id },
          data: { attempts, lastError: e?.message || 'Échec', status: giveUp ? 'FAILED' : 'QUEUED', scheduledAt: new Date(Date.now() + 30 * 60_000) },
        });
        await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { status: 'READY' } });
        stats.failed++;
        console.warn('[campagne] envoi échoué :', e?.message || e);
      }
    }
    return stats;
  },
};
