import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

router.get('/me', userController.getCurrentUser);
router.put('/me', userController.updateCurrentUser);

// RGPD
router.get('/me/export', userController.exportData);
router.delete('/me', userController.deleteAccount);

export default router;
