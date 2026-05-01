import { Router } from 'express';
import { cvController } from '../controllers/cv.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/', asyncHandler(cvController.list));
router.post('/', asyncHandler(cvController.create));
router.put('/:id', asyncHandler(cvController.update));
router.delete('/:id', asyncHandler(cvController.delete));

export default router;
