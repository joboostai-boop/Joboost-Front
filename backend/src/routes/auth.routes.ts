import { Router, urlencoded } from 'express';
import { authController } from '../controllers/auth.controller';
import { googleAuthController } from '../controllers/google-auth.controller';
import { linkedinAuthController } from '../controllers/linkedin-auth.controller';
import { appleAuthController } from '../controllers/apple-auth.controller';
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

// LinkedIn OAuth (Sign In with LinkedIn — OpenID Connect)
router.get('/linkedin', linkedinAuthController.login);
router.get('/linkedin/callback', linkedinAuthController.callback);

// Sign in with Apple — Apple POSTe le callback en form-urlencoded (response_mode=form_post)
router.get('/apple', appleAuthController.login);
router.post('/apple/callback', urlencoded({ extended: false }), appleAuthController.callback);

export default router;
