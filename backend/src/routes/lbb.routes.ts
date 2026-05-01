import { Router } from 'express';
import { lbbController } from '../controllers/lbb.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/search', asyncHandler(lbbController.searchCompanies));
router.post('/apply', asyncHandler(lbbController.applySpontaneous));

export default router;
