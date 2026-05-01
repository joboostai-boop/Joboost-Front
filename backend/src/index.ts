import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
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
import stripeRoutes from './routes/stripe.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ⚠️ Stripe Webhook: doit recevoir le body brut AVANT express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

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
// Initialize Stripe Billing
app.use('/api/stripe', stripeRoutes);

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
});
