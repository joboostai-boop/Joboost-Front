import { Router } from 'express';
import { spontaneousController } from '../controllers/spontaneous.controller';
import { aiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(spontaneousController.list));
// Détection d'email employeur (scraping best-effort) → rate-limité comme les routes IA.
router.post('/detect-contact', aiLimiter, asyncHandler(spontaneousController.detectContact));
router.post('/prepare', asyncHandler(spontaneousController.prepare));
router.get('/:id', asyncHandler(spontaneousController.get));
router.post('/:id/send', asyncHandler(spontaneousController.send));
router.post('/:id/follow-up', asyncHandler(spontaneousController.followUp));
router.post('/:id/blacklist', asyncHandler(spontaneousController.blacklist));

export default router;
