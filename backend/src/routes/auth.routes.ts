import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { googleAuthController } from '../controllers/google-auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/business-login', authController.businessLogin);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

// Google OAuth
router.get('/google', googleAuthController.login);
router.get('/google/callback', googleAuthController.callback);

export default router;
