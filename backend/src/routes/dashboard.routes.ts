import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/stats', asyncHandler(dashboardController.getStats));

export default router;
