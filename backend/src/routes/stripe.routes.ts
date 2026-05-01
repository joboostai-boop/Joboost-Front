import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { requireAuth } from '../middleware/auth.middleware';
import { prisma } from '../db';

const router = Router();

/**
 * POST /api/stripe/create-checkout
 * Crée une session Stripe Checkout et retourne l'URL de redirection
 */
router.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    const { url } = await stripeService.createCheckoutSession(userId, user.email);
    res.json({ success: true, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création du checkout';
    console.error('Stripe Checkout Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/stripe/subscription-status
 * Retourne le statut d'abonnement de l'utilisateur authentifié
 */
router.get('/subscription-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await stripeService.getSubscriptionStatus(req.userId!);
    res.json({ success: true, ...status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/stripe/webhook
 * Reçoit les événements Stripe (body brut requis — pas de express.json())
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const result = await stripeService.handleWebhookEvent(req.body as Buffer, sig);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    console.error('Stripe Webhook Error:', message);
    res.status(400).json({ error: `Webhook Error: ${message}` });
  }
});

export default router;
