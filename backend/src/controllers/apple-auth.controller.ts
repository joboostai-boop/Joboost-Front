import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import {
  JWT_SECRET,
  APPLE_CLIENT_ID,
  APPLE_TEAM_ID,
  APPLE_KEY_ID,
  APPLE_PRIVATE_KEY,
  APPLE_REDIRECT_URI,
  FRONTEND_URL,
} from '../config';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
};

// Endpoints « Sign in with Apple »
const AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_ISS = 'https://appleid.apple.com';

export const isAppleConfigured = (): boolean =>
  Boolean(APPLE_CLIENT_ID && APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY);

/**
 * Le « client secret » d'Apple n'est pas une chaîne fixe : c'est un JWT court
 * signé en ES256 avec la clé privée .p8 (valide 6 mois max). On le régénère à la volée.
 */
const buildClientSecret = (): string => {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: APPLE_TEAM_ID,
      iat: now,
      exp: now + 60 * 5, // court : juste le temps de l'échange de code
      aud: APPLE_ISS,
      sub: APPLE_CLIENT_ID,
    },
    APPLE_PRIVATE_KEY,
    { algorithm: 'ES256', keyid: APPLE_KEY_ID },
  );
};

// Extrait le nom transmis par Apple UNIQUEMENT à la première connexion (champ POST `user`).
const parseAppleUserName = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string' || !raw) return undefined;
  try {
    const u = JSON.parse(raw);
    const first = u?.name?.firstName || '';
    const last = u?.name?.lastName || '';
    const full = [first, last].filter(Boolean).join(' ').trim();
    return full || undefined;
  } catch {
    return undefined;
  }
};

export const appleAuthController = {
  /**
   * GET /api/auth/apple
   * Construit l'URL d'autorisation Apple et la renvoie au frontend.
   */
  login: (req: Request, res: Response) => {
    if (!isAppleConfigured()) {
      return res.status(501).json({
        success: false,
        error: 'Sign in with Apple non configuré. Ajoutez APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID et APPLE_PRIVATE_KEY dans votre .env',
      });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: APPLE_CLIENT_ID,
      redirect_uri: APPLE_REDIRECT_URI,
      state,
      scope: 'name email',
      // Obligatoire dès qu'on demande name/email : Apple POST le callback (form_post).
      response_mode: 'form_post',
    });

    res.json({ success: true, url: `${AUTH_URL}?${params.toString()}` });
  },

  /**
   * POST /api/auth/apple/callback  (form-urlencoded, envoyé par Apple)
   * Corps : code, state, id_token, et `user` (JSON) seulement à la 1re connexion.
   */
  callback: async (req: Request, res: Response) => {
    try {
      const code = req.body?.code;
      if (!code || typeof code !== 'string') {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=apple_missing_code`);
      }

      // 1. Échange du code contre les tokens (client_secret = JWT signé ES256).
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: APPLE_REDIRECT_URI,
          client_id: APPLE_CLIENT_ID,
          client_secret: buildClientSecret(),
        }),
      });

      if (!tokenRes.ok) {
        const txt = await tokenRes.text().catch(() => '');
        console.error('Apple token error:', tokenRes.status, txt.slice(0, 300));
        return res.redirect(`${FRONTEND_URL}/auth/login?error=apple_token_failed`);
      }

      const tokenJson: any = await tokenRes.json();
      const idToken: string | undefined = tokenJson.id_token;
      if (!idToken) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=apple_no_id_token`);
      }

      // 2. Décodage de l'id_token. Il provient directement de l'endpoint token d'Apple
      //    via une connexion TLS authentifiée → on décode et on valide iss/aud/exp.
      const payload: any = jwt.decode(idToken);
      if (!payload || payload.iss !== APPLE_ISS || payload.aud !== APPLE_CLIENT_ID) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=apple_invalid_token`);
      }
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=apple_expired_token`);
      }

      const email: string | undefined = payload.email;
      if (!email) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=apple_no_email`);
      }
      // Le nom n'est transmis qu'à la 1re connexion (champ POST `user`).
      const appleName = parseAppleUserName(req.body?.user);

      // 3. Trouver ou créer l'utilisateur.
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: appleName || email.split('@')[0],
            password: null, // Login OAuth uniquement
          },
        });
      } else if (appleName && (!user.name || user.name === email.split('@')[0])) {
        // Renseigne le nom si on l'a (1re connexion) et qu'il manquait.
        user = await prisma.user.update({ where: { id: user.id }, data: { name: appleName } });
      }

      // 4. Session JobBoost (JWT en cookie + fragment d'URL pour le mobile).
      const jwtToken = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' },
      );
      res.cookie('token', jwtToken, COOKIE_OPTIONS);
      res.redirect(`${FRONTEND_URL}/dashboard?oauth=apple#token=${jwtToken}`);
    } catch (error: unknown) {
      console.error('Apple OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/auth/login?error=apple_oauth_failed`);
    }
  },
};
