import { Router } from 'express';
import { coverLetterController } from '../controllers/coverletter.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/', asyncHandler(coverLetterController.list));
router.post('/', asyncHandler(coverLetterController.create));
router.put('/:id', asyncHandler(coverLetterController.update));
router.delete('/:id', asyncHandler(coverLetterController.delete));

export default router;
