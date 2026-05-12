import { Router } from 'express';
import { businessController } from '../controllers/business.controller';
import { requireBusinessRole } from '../middleware/requireBusiness.middleware';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Toutes les routes business nécessitent le rôle BUSINESS_PARTNER
router.use(requireBusinessRole);

// --- Offres d'emploi ---
router.post('/offers', asyncHandler(businessController.createOffer));
router.get('/offers', asyncHandler(businessController.listOffers));
router.put('/offers/:id', asyncHandler(businessController.updateOffer));
router.delete('/offers/:id', asyncHandler(businessController.deleteOffer));
router.patch('/offers/:id/publish', asyncHandler(businessController.togglePublish));

// --- Demandeurs d'emploi ---
router.get('/jobseekers', asyncHandler(businessController.listJobseekers));
router.get('/jobseekers/:id', asyncHandler(businessController.getJobseekerDetail));

// --- Statistiques ---
router.get('/stats', asyncHandler(businessController.getStats));

export default router;
