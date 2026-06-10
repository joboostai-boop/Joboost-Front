import { Router } from 'express';
import { lbbController } from '../controllers/lbb.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/search', asyncHandler(lbbController.searchCompanies));
// NB : la préparation/l'envoi des candidatures spontanées a migré vers /api/spontaneous

export default router;
