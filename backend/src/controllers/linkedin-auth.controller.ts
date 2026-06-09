import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import {
  JWT_SECRET,
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI,
  FRONTEND_URL,
} from '../config';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
};

// Endpoints LinkedIn « Sign In with LinkedIn using OpenID Connect »
const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

export const linkedinAuthController = {
  /**
   * GET /api/auth/linkedin
   * Construit l'URL d'autorisation LinkedIn et la renvoie au frontend.
   */
  login: (req: Request, res: Response) => {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      return res.status(501).json({
        success: false,
        error: 'LinkedIn OAuth non configuré. Ajoutez LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET dans votre .env',
      });
    }

    // State anti-CSRF stocké en cookie httpOnly, vérifié au retour.
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('linkedin_oauth_state', state, {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: 10 * 60 * 1000, // 10 min
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      state,
      scope: 'openid profile email',
    });

    res.json({ success: true, url: `${AUTH_URL}?${params.toString()}` });
  },

  /**
   * GET /api/auth/linkedin/callback?code=xxx&state=xxx
   * Échange le code, récupère le profil (nom + photo + email), connecte/crée l'utilisateur.
   */
  callback: async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      const savedState = req.cookies?.linkedin_oauth_state;
      res.clearCookie('linkedin_oauth_state');

      if (!code || typeof code !== 'string') {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=linkedin_missing_code`);
      }
      if (!state || !savedState || state !== savedState) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=linkedin_state_mismatch`);
      }

      // 1. Échange du code contre un access_token
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
          redirect_uri: LINKEDIN_REDIRECT_URI,
        }),
      });

      if (!tokenRes.ok) {
        const txt = await tokenRes.text().catch(() => '');
        console.error('LinkedIn token error:', tokenRes.status, txt.slice(0, 300));
        return res.redirect(`${FRONTEND_URL}/auth/login?error=linkedin_token_failed`);
      }
      const tokenJson: any = await tokenRes.json();
      const accessToken = tokenJson.access_token;

      // 2. Récupération du profil (OpenID userinfo)
      const infoRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!infoRes.ok) {
        const txt = await infoRes.text().catch(() => '');
        console.error('LinkedIn userinfo error:', infoRes.status, txt.slice(0, 300));
        return res.redirect(`${FRONTEND_URL}/auth/login?error=linkedin_profile_failed`);
      }
      const info: any = await infoRes.json();
      const email: string | undefined = info.email;
      const name: string | undefined = info.name || [info.given_name, info.family_name].filter(Boolean).join(' ');
      const picture: string | undefined = info.picture;

      if (!email) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=linkedin_no_email`);
      }

      // 3. Trouver ou créer l'utilisateur, et synchroniser nom + photo
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            password: null, // Login OAuth uniquement
            photoUrl: picture || null,
          },
        });
      } else if (picture && user.photoUrl !== picture) {
        // Met à jour la photo si LinkedIn en fournit une nouvelle.
        user = await prisma.user.update({
          where: { id: user.id },
          data: { photoUrl: picture },
        });
      }

      // 4. Session JobBoost (JWT en cookie)
      const jwtToken = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organizationId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.cookie('token', jwtToken, COOKIE_OPTIONS);

      res.redirect(`${FRONTEND_URL}/dashboard?oauth=linkedin`);
    } catch (error: unknown) {
      console.error('LinkedIn OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/auth/login?error=linkedin_oauth_failed`);
    }
  },
};
