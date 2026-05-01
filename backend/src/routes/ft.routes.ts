import { Router } from 'express';
import { ftController } from '../controllers/ft.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// /api/auth/ft/login -> Requires User Auth so we know who asks for FT linking.
router.get('/login', requireAuth, ftController.login);

// The callback does not require Auth token if we use cookies, but we DO use JWT cookie!
// So requireAuth will successfully read req.cookies.token set by JobBoost login.
router.get('/callback', requireAuth, ftController.callback);

export default router;
