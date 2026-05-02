import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import {
  JWT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_URL,
} from '../config';

const oauthClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
};

export const googleAuthController = {
  /**
   * GET /api/auth/google
   * Génère l'URL d'autorisation Google et redirige le frontend
   */
  login: (req: Request, res: Response) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({
        success: false,
        error: 'Google OAuth non configuré. Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans votre .env',
      });
    }

    const authorizeUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    });

    res.json({ success: true, url: authorizeUrl });
  },

  /**
   * GET /api/auth/google/callback?code=xxx
   * Échange le code d'autorisation contre un token, crée/connecte l'utilisateur
   */
  callback: async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=missing_code`);
      }

      // Échanger le code contre des tokens
      const { tokens } = await oauthClient.getToken(code);
      oauthClient.setCredentials(tokens);

      // Vérifier et décoder l'id_token
      if (!tokens.id_token) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=no_id_token`);
      }

      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=invalid_token`);
      }

      const { email, name, picture, sub: googleId } = payload;

      // Trouver ou créer l'utilisateur
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Créer un nouvel utilisateur via Google (pas de mot de passe)
        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            password: null, // Login OAuth uniquement
          },
        });
      }

      // Générer le JWT JobBoost
      const jwtToken = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', jwtToken, COOKIE_OPTIONS);

      // Rediriger vers le frontend avec succès
      res.redirect(`${FRONTEND_URL}/dashboard?oauth=success`);
    } catch (error: unknown) {
      console.error('Google OAuth callback error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed&message=${encodeURIComponent(message)}`);
    }
  },
};
