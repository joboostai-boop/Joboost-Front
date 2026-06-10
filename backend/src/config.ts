import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be defined in environment variables. Set it in your .env file.`);
  }
  return value;
}

export const JWT_SECRET = requireEnv('JWT_SECRET');
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy';
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_dummy';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Google OAuth (optionnel — le serveur démarre même sans)
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback';

// LinkedIn « Sign In with LinkedIn using OpenID Connect » (optionnel — le serveur démarre sans)
export const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
export const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
export const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/auth/linkedin/callback';

// « Sign in with Apple » (optionnel — le serveur démarre sans).
// APPLE_CLIENT_ID = identifiant du Services ID (ex. com.joboost.signin).
// APPLE_TEAM_ID   = Team ID (10 caractères). APPLE_KEY_ID = Key ID de la clé .p8.
// APPLE_PRIVATE_KEY = contenu PEM de la clé .p8 (sauts de ligne échappés \n autorisés dans le .env).
export const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
export const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
export const APPLE_KEY_ID = process.env.APPLE_KEY_ID || '';
export const APPLE_PRIVATE_KEY = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
export const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI || 'http://localhost:4000/api/auth/apple/callback';
