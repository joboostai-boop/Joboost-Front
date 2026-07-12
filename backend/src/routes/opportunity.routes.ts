import { Router } from 'express';
import { opportunityController } from '../controllers/opportunity.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Recommandations simulées dynamiquement
router.get('/recommendations', asyncHandler(opportunityController.getRecommendations));

// Offres des organismes partenaires (affichées sur l'Accueil)
router.get('/partner-offers', asyncHandler(opportunityController.getPartnerOffers));

// CRUD Sauvegardes
router.get('/saved', asyncHandler(opportunityController.listSaved));
router.post('/saved', asyncHandler(opportunityController.createSaved));
router.delete('/saved/:id', asyncHandler(opportunityController.deleteSaved));

export default router;
