import { Router } from 'express';
import { businessController } from '../controllers/business.controller';
import { requireBusinessRole } from '../middleware/requireBusiness.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Toutes les routes business nécessitent le rôle BUSINESS_PARTNER
router.use(requireBusinessRole);

// --- Compte / entreprise ---
router.get('/account', asyncHandler(businessController.getAccount));
router.put('/account', asyncHandler(businessController.updateAccount));

// --- Offres d'emploi ---
// NB : '/offers/assist' est déclaré avant les routes paramétrées '/offers/:id'.
router.post('/offers/assist', aiLimiter, asyncHandler(businessController.assistOffer));
router.post('/offers', asyncHandler(businessController.createOffer));
router.get('/offers', asyncHandler(businessController.listOffers));
router.put('/offers/:id', asyncHandler(businessController.updateOffer));
router.delete('/offers/:id', asyncHandler(businessController.deleteOffer));
router.patch('/offers/:id/publish', asyncHandler(businessController.togglePublish));
router.get('/offers/:id/matches', asyncHandler(businessController.getOfferMatches));

// --- Demandeurs d'emploi ---
router.get('/jobseekers', asyncHandler(businessController.listJobseekers));
router.post('/jobseekers', asyncHandler(businessController.createJobseeker));
router.get('/jobseekers/:id', asyncHandler(businessController.getJobseekerDetail));
router.put('/jobseekers/:id', asyncHandler(businessController.updateJobseeker));
router.patch('/jobseekers/:id/status', asyncHandler(businessController.updateJobseekerStatus));
router.patch('/jobseekers/:id/note', asyncHandler(businessController.updateJobseekerNote));
router.delete('/jobseekers/:id', asyncHandler(businessController.removeJobseeker));
router.post('/jobseekers/:id/outreach', aiLimiter, asyncHandler(businessController.generateOutreach));

// --- Facturation (Stripe) ---
router.post('/billing/checkout', asyncHandler(businessController.createBillingCheckout));
router.post('/billing/portal', asyncHandler(businessController.createBillingPortal));

// --- Statistiques ---
router.get('/stats', asyncHandler(businessController.getStats));

export default router;
