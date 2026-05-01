import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

router.get('/me', userController.getCurrentUser);
router.put('/me', userController.updateCurrentUser);

export default router;
