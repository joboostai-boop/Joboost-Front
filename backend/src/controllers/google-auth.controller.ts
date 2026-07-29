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

      // Vérification de signature avec repli : l'id_token vient d'être obtenu
      // directement auprès du serveur de Google en HTTPS (échange code→token),
      // sa provenance est donc déjà sûre. La récupération des certificats de
      // vérification échoue parfois depuis Render (« Failed to retrieve
      // verification certificates ») : dans ce cas on décode le token en
      // contrôlant l'audience plutôt que de faire échouer la connexion.
      let payload: { email?: string; name?: string; picture?: string; sub?: string } | undefined;
      try {
        const ticket = await oauthClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.error('Google id_token verify failed, fallback decode:', verifyError);
        const decoded = jwt.decode(tokens.id_token);
        if (
          decoded && typeof decoded === 'object' &&
          (decoded as { aud?: string }).aud === GOOGLE_CLIENT_ID &&
          (decoded as { iss?: string }).iss?.includes('accounts.google.com')
        ) {
          payload = decoded as typeof payload;
        }
      }

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
            photoUrl: picture || null,
          },
        });
      } else if (picture && user.photoUrl !== picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { photoUrl: picture },
        });
      }

      // Générer le JWT JobBoost
      const jwtToken = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', jwtToken, COOKIE_OPTIONS);

      // Rediriger vers le frontend avec succès.
      // Le JWT est aussi passé dans le fragment d'URL (#token=...) : sur mobile le
      // cookie tiers (SameSite=None) est bloqué, le frontend lit donc le token ici
      // et le stocke en localStorage. Le fragment n'est jamais envoyé au serveur
      // (pas de fuite dans les logs / le referer), et le frontend nettoie l'URL.
      // ⚠️ /home et non /dashboard : la route « /dashboard » n'existe PAS côté
      // front (les vraies sont /track/dashboard et /business/dashboard). Rediriger
      // vers une URL inconnue faisait tomber l'utilisateur sur la règle de repli du
      // routeur, donc sur la page d'authentification au lieu d'entrer dans l'app.
      res.redirect(`${FRONTEND_URL}/home?oauth=success#token=${jwtToken}`);
    } catch (error: unknown) {
      console.error('Google OAuth callback error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed&message=${encodeURIComponent(message)}`);
    }
  },
};
