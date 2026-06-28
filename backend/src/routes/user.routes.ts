import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

router.get('/me', userController.getCurrentUser);
router.get('/usage', userController.getUsage);
router.put('/me', userController.updateCurrentUser);
router.put('/me/password', userController.changePassword);

// RGPD
router.get('/me/export', userController.exportData);
router.delete('/me', userController.deleteAccount);

export default router;
