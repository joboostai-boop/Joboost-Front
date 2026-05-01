import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/', asyncHandler(applicationController.create));
router.get('/', asyncHandler(applicationController.list));
router.put('/:id', asyncHandler(applicationController.update));
router.delete('/:id', asyncHandler(applicationController.delete));

export default router;
