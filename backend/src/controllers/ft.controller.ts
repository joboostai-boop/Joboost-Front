import { Request, Response } from 'express';
import { prisma } from '../db';
import crypto from 'crypto';

const FT_CLIENT_ID = process.env.FRANCE_TRAVAIL_CLIENT_ID || 'placeholder_client_id';
const FT_CLIENT_SECRET = process.env.FRANCE_TRAVAIL_CLIENT_SECRET || 'placeholder_client_secret';
// The redirect URI must match exactly what is registered in the France Travail portal
const FT_REDIRECT_URI = process.env.FRANCE_TRAVAIL_REDIRECT_URI || 'http://localhost:4000/api/auth/ft/callback';

export const ftController = {
  // Step 1: Redirect user to FT Authorization endpoint
  login: async (req: Request, res: Response) => {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      
      // Enregistrer le state en cookie pour validation lors du retour (sécurité CSRF)
      res.cookie('ft_oauth_state', state, { httpOnly: true, maxAge: 1000 * 60 * 15 }); // 15 min

      // URL de développement / bac à sable ou prod
      const authorizeUrl = new URL('https://authentification-candidat.pole-emploi.fr/connexion/oauth2/authorize');
      authorizeUrl.searchParams.append('client_id', FT_CLIENT_ID);
      authorizeUrl.searchParams.append('response_type', 'code');
      authorizeUrl.searchParams.append('redirect_uri', FT_REDIRECT_URI);
      authorizeUrl.searchParams.append('state', state);
      authorizeUrl.searchParams.append('scope', `api_candidat api_opportunites application_${FT_CLIENT_ID}`);

      // Rediriger le frontend vers France Travail
      res.json({ success: true, url: authorizeUrl.toString() });
    } catch (error: any) {
      console.error('Erreur lors de la préparation OAuth FT', error);
      res.status(500).json({ success: false, error: 'Erreur Serveur' });
    }
  },

  // Step 2: Callback when FT redirects back with code
  callback: async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query;
      const storedState = req.cookies?.ft_oauth_state;

      // Handle FT errors
      if (error) {
        console.error('FT OAuth Error:', error, error_description);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/target/lbb?error=access_denied`);
      }

      // Check CSRF token
      if (!state || state !== storedState) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/target/lbb?error=invalid_state`);
      }

      // Vider le cookie state
      res.clearCookie('ft_oauth_state');

      // Exchange code for access token
      const tokenResponse = await fetch('https://authentification-candidat.pole-emploi.fr/connexion/oauth2/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          client_id: FT_CLIENT_ID,
          client_secret: FT_CLIENT_SECRET,
          redirect_uri: FT_REDIRECT_URI
        })
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Erreur Token FT', tokenData);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/target/lbb?error=token_exchange_failed`);
      }

      // Save tokens to current User profile
      const userId = req.userId;
      if (!userId) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login?error=unauthorized`);
      }

      // Calcul de la date d'expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

      await prisma.user.update({
        where: { id: userId },
        data: {
          ftAccessToken: tokenData.access_token,
          ftRefreshToken: tokenData.refresh_token,
          ftTokenExpiresAt: expiresAt
        }
      });

      // Redirect back to frontend
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/target/lbb?success=ft_connected`);

    } catch (err: any) {
      console.error('FT Callback Catch Error:', err);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/target/lbb?error=server_error`);
    }
  }
};
