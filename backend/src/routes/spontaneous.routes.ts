import { Router } from 'express';
import { spontaneousController } from '../controllers/spontaneous.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(spontaneousController.list));
router.post('/prepare', asyncHandler(spontaneousController.prepare));
router.get('/:id', asyncHandler(spontaneousController.get));
router.post('/:id/send', asyncHandler(spontaneousController.send));
router.post('/:id/follow-up', asyncHandler(spontaneousController.followUp));
router.post('/:id/blacklist', asyncHandler(spontaneousController.blacklist));

export default router;
