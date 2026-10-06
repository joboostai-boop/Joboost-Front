import { campaignService } from '../services/campaign.service';
import { prisma } from '../db';
import { companyContactService } from '../services/companyContact.service';
import { Router } from 'express';
import { spontaneousController } from '../controllers/spontaneous.controller';
import { aiLimiter } from '../middleware/rateLimit.middleware';
import { requireSubscription } from '../middleware/premium.middleware';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// La CONSULTATION reste ouverte : un compte gratuit peut voir ses candidatures
// spontanées passées. Sinon un abonné qui résilie perdrait l'accès à son propre
// historique, ce qui serait abusif.
router.get('/', asyncHandler(spontaneousController.list));
router.get('/:id', asyncHandler(spontaneousController.get));

// Tout ce qui CRÉE ou ENVOIE est réservé à l'abonnement (ou à l'essai en cours).
// Le verrou est posé au niveau de la route, pas dans le contrôleur : impossible
// de l'oublier en ajoutant une action plus tard.
router.post('/detect-contact', requireSubscription, aiLimiter, asyncHandler(spontaneousController.detectContact));
router.post('/prepare', requireSubscription, asyncHandler(spontaneousController.prepare));
router.post('/:id/send', requireSubscription, asyncHandler(spontaneousController.send));
// File d'envoi depuis la boîte du candidat (lettre validée par lui).
router.post('/:id/queue', requireSubscription, asyncHandler(async (req: any, res: any) => {
  try {
    const item = await campaignService.queue(req.userId, req.params.id, req.body?.coverLetterText);
    res.json({ success: true, data: item });
  } catch (e: any) {
    res.status(e?.status || 400).json({ success: false, error: e?.message || "Impossible d'ajouter à la file." });
  }
}));
// Correction par le candidat : adresse e-mail saisie à la main et/ou lettre retouchée.
router.patch('/:id', asyncHandler(async (req: any, res: any) => {
  const sp = await prisma.spontaneousApplication.findUnique({ where: { id: req.params.id } });
  if (!sp || sp.userId !== req.userId) return res.status(404).json({ success: false, error: 'Candidature introuvable.' });
  if (['SENT', 'SENDING', 'FOLLOWED_UP', 'REPLIED'].includes(sp.status)) return res.status(409).json({ success: false, error: 'Candidature déjà envoyée.' });
  const data: any = {};
  if (typeof req.body?.contactEmail === 'string') {
    const email = req.body.contactEmail.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Adresse e-mail invalide.' });
    data.contactEmail = email || null;
    data.contactSource = 'manual';
    // Adresse validée par un humain : elle profitera aux prochains candidats (base partagée).
    if (email) await companyContactService.save(sp.companyName, email, { location: sp.companyAddress || undefined, source: 'manual' });
  }
  if (typeof req.body?.coverLetterText === 'string') data.coverLetterText = req.body.coverLetterText.trim();
  const updated = await prisma.spontaneousApplication.update({ where: { id: sp.id }, data });
  res.json({ success: true, data: updated });
}));
router.delete('/:id/queue', asyncHandler(async (req: any, res: any) => {
  await campaignService.cancel(req.userId, req.params.id);
  res.json({ success: true });
}));
router.post('/:id/follow-up', requireSubscription, asyncHandler(spontaneousController.followUp));
router.post('/:id/blacklist', asyncHandler(spontaneousController.blacklist));

export default router;
