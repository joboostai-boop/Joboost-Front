import { Router } from 'express';
import { alternanceController } from '../controllers/alternance.controller';
import { aiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/search', asyncHandler(alternanceController.search));
// Envoi d'une vraie candidature → rate-limité pour éviter les abus.
router.post('/apply', aiLimiter, asyncHandler(alternanceController.apply));

export default router;
