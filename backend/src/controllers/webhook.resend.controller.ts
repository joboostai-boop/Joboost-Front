import { Request, Response } from 'express';
import { prisma } from '../db';

// ====================================================================
//  Webhook Resend — tracking des candidatures spontanées envoyées.
//  Événements gérés : email.bounced, email.delivered, email.opened, email.complained.
//  Le rapprochement se fait via le Message-ID (data.email_id) stocké à l'envoi.
//  Route publique (pas de requireAuth) — à protéger en V2 via signature Svix.
// ====================================================================

export const resendWebhookController = {
  handle: async (req: Request, res: Response) => {
    try {
      const event = req.body || {};
      const type: string = event.type || '';
      const emailId: string | undefined = event?.data?.email_id || event?.data?.id;
      if (!emailId) return res.json({ received: true });

      const sp = await prisma.spontaneousApplication.findFirst({ where: { messageId: emailId } });
      if (!sp) return res.json({ received: true });

      const now = new Date();
      switch (type) {
        case 'email.bounced':
        case 'email.complained':
          await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { status: 'BOUNCED', bouncedAt: now, followUpAt: null } });
          break;
        case 'email.opened':
          if (!sp.openedAt) await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { openedAt: now } });
          break;
        // email.delivered : on ne change pas le statut (déjà SENT)
        default:
          break;
      }
      res.json({ received: true });
    } catch (e: any) {
      console.error('Resend webhook error', e?.message || e);
      res.json({ received: true }); // on acquitte toujours pour éviter les retries en boucle
    }
  },
};
