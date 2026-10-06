import { Router, Request, Response } from 'express';
import { mailboxService } from '../services/mailbox.service';
import { campaignService } from '../services/campaign.service';

// Boîte mail du candidat (envoi uniquement) + état de sa campagne d'envoi.
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.json({ success: true, available: mailboxService.isAvailable(), data: await mailboxService.status(req.userId!) });
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = await mailboxService.connect(req.userId!, req.body?.email, req.body?.appPassword);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message || 'Connexion impossible.' });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  await mailboxService.disconnect(req.userId!);
  res.json({ success: true });
});

router.get('/campaign', async (req: Request, res: Response) => {
  res.json({ success: true, data: await campaignService.overview(req.userId!) });
});

export default router;
