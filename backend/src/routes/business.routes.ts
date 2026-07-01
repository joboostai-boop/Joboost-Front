import { Router } from 'express';
import { businessController } from '../controllers/business.controller';
import { requireBusinessRole } from '../middleware/requireBusiness.middleware';

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

// --- Statistiques ---
router.get('/stats', asyncHandler(businessController.getStats));

export default router;
