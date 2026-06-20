import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { checkDbConnection } from './db';
import { requireAuth } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';
import ftRoutes from './routes/ft.routes';
import aiRoutes from './routes/ai.routes';
import userRoutes from './routes/user.routes';
import applicationRoutes from './routes/application.routes';
import cvRoutes from './routes/cv.routes';
import coverLetterRoutes from './routes/coverletter.routes';
import opportunityRoutes from './routes/opportunity.routes';
import dashboardRoutes from './routes/dashboard.routes';
import lbbRoutes from './routes/lbb.routes';
import spontaneousRoutes from './routes/spontaneous.routes';
import { resendWebhookController } from './controllers/webhook.resend.controller';
import stripeRoutes from './routes/stripe.routes';
import businessRoutes from './routes/business.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ⚠️ Stripe Webhook: doit recevoir le body brut AVANT express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Compression Gzip pour optimiser les temps de réponse
app.use(compression());

// Middleware global (après la route webhook)
app.use(express.json());
app.use(cookieParser());

// Initialize Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/ft', ftRoutes);
// Initialize AI Routes
app.use('/api/ai', requireAuth, aiRoutes);
// Initialize User Routes
app.use('/api/users', requireAuth, userRoutes);
// Initialize Application Routes
app.use('/api/applications', requireAuth, applicationRoutes);
// Initialize CV Routes
app.use('/api/cvs', requireAuth, cvRoutes);
// Initialize Cover Letter Routes
app.use('/api/coverletters', requireAuth, coverLetterRoutes);
// Initialize Opportunities
app.use('/api/opportunities', requireAuth, opportunityRoutes);
// Initialize Dashboard Stats
app.use('/api/dashboard', requireAuth, dashboardRoutes);
// Initialize La Bonne Boite (Company search)
app.use('/api/lbb', requireAuth, lbbRoutes);
// Candidatures spontanées (préparation / envoi / suivi)
app.use('/api/spontaneous', requireAuth, spontaneousRoutes);
// Webhook Resend (tracking envois) — route publique
app.post('/api/webhooks/resend', resendWebhookController.handle);
// Initialize Stripe Billing
app.use('/api/stripe', stripeRoutes);
// Initialize Business Session (partenaires professionnels)
app.use('/api/business', requireAuth, businessRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'JobBoost Backend is running 😎' });
});

// Global Error Handler to guarantee JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🔥 GLOBAL EXPRESS ERROR:", err);
  res.status(500).json({ success: false, error: err.message || "Erreur Interne au Serveur" });
});

app.listen(PORT, async () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    await checkDbConnection();

    // Relances des candidatures spontanées : scheduler in-process optionnel.
    // Activer avec ENABLE_FOLLOWUP_CRON=true (sinon utiliser un cron externe : `npm run job:followup`).
    if (process.env.ENABLE_FOLLOWUP_CRON === 'true') {
      const { runFollowUpJob } = await import('./jobs/followup.job');
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      const tick = () => runFollowUpJob()
        .then((r) => console.log('[followup] passage :', r))
        .catch((e) => console.error('[followup] erreur :', e?.message || e));
      setTimeout(tick, 60_000);        // premier passage 1 min après le démarrage
      setInterval(tick, SIX_HOURS);    // puis toutes les 6 h
      console.log('⏰ Relances spontanées : scheduler in-process activé (toutes les 6 h).');
    }

    // Alertes emploi par email : scheduler in-process optionnel.
    // Activer avec ENABLE_JOB_ALERTS_CRON=true (sinon cron externe : `npm run job:alerts`).
    // Le job lui-même décide, par utilisateur, si la fréquence (quotidienne/hebdo) est due.
    if (process.env.ENABLE_JOB_ALERTS_CRON === 'true') {
      const { runJobAlertsJob } = await import('./jobs/jobAlerts.job');
      const THREE_HOURS = 3 * 60 * 60 * 1000;
      const tickAlerts = () => runJobAlertsJob()
        .then((r) => console.log('[jobAlerts] passage :', r))
        .catch((e) => console.error('[jobAlerts] erreur :', e?.message || e));
      setTimeout(tickAlerts, 90_000);       // premier passage ~1,5 min après le démarrage
      setInterval(tickAlerts, THREE_HOURS); // puis toutes les 3 h (la fréquence par user est gérée dans le job)
      console.log('📬 Alertes emploi : scheduler in-process activé (vérif toutes les 3 h).');
    }
});
