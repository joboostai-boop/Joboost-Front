import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

/**
 * Limiteurs de débit (anti-abus). Render tourne derrière un proxy : `app.set('trust proxy', 1)`
 * est positionné dans index.ts pour que la clé soit la vraie IP du client (X-Forwarded-For)
 * et non celle du proxy (sinon tous les utilisateurs partageraient le même compteur).
 */

const tooMany = (message: string) => ({ success: false, code: 'RATE_LIMITED', error: message });

/**
 * Authentification : protège login / inscription contre le brute-force.
 * Volontairement appliqué UNIQUEMENT aux routes sensibles (pas à /me ni aux
 * callbacks OAuth, appelés à chaque chargement de l'app).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,                  // 20 tentatives / IP / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany("Trop de tentatives. Réessayez dans quelques minutes."),
});

/**
 * Routes IA : borne le coût Gemini par utilisateur (plusieurs endpoints IA
 * ne sont pas plafonnés par le quota de candidatures). Clé = userId si
 * authentifié, sinon IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,             // 30 appels IA / utilisateur / min
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request, res) =>
    req.userId ? `u:${req.userId}` : ipKeyGenerator(req.ip ?? ''),
  message: tooMany("Trop de requêtes IA d'affilée. Patientez quelques secondes."),
});
