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
router.post('/:id/follow-up', requireSubscription, asyncHandler(spontaneousController.followUp));
router.post('/:id/blacklist', asyncHandler(spontaneousController.blacklist));

export default router;
