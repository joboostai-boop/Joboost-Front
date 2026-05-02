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
