import { Router, urlencoded } from 'express';
import { authController } from '../controllers/auth.controller';
import { googleAuthController } from '../controllers/google-auth.controller';
import { linkedinAuthController } from '../controllers/linkedin-auth.controller';
import { appleAuthController } from '../controllers/apple-auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Rate-limit uniquement sur les routes sensibles (anti brute-force).
// On n'applique PAS le limiteur à /me ni aux callbacks OAuth (appelés à chaque chargement).
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/business-register', authLimiter, authController.businessRegister);
router.post('/business-login', authLimiter, authController.businessLogin);
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
