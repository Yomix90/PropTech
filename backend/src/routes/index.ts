import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { SpacesController } from '../controllers/spacesController.js';
import { BookingsController } from '../controllers/bookingsController.js';
import { RecommendationsController } from '../controllers/recommendationsController.js';
import { ReviewsController } from '../controllers/reviewsController.js';
import { ManagerController } from '../controllers/managerController.js';

import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  updatePreferencesSchema,
  spaceFilterSchema,
  createSpaceSchema,
  updateSpaceSchema,
  createBookingSchema,
  updateBookingStatusSchema,
  createReviewSchema,
} from '../validators/schemas.js';
import { isLiveSupabase } from '../config/supabase.js';

const router = Router();

// ==============================================================================
// HEALTH CHECK
// ==============================================================================
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isLiveSupabase ? 'Supabase Cloud (PostgreSQL)' : 'Local Resilient Store',
    aiEngine: 'Claude API (Anthropic 3.5 Sonnet / Heuristic Fallback)',
  });
});

// ==============================================================================
// AUTHENTIFICATION & PROFIL
// ==============================================================================
router.post('/auth/register', validateBody(registerSchema), AuthController.register);
router.post('/auth/login', validateBody(loginSchema), AuthController.login);
router.get('/auth/me', authenticate, AuthController.getMe);
router.patch('/auth/preferences', authenticate, validateBody(updatePreferencesSchema), AuthController.updatePreferences);

// ==============================================================================
// ESPACES DE COWORKING (SPACES)
// ==============================================================================
router.get('/spaces', validateQuery(spaceFilterSchema), SpacesController.getSpaces);
router.get('/spaces/:id', SpacesController.getSpaceById);
router.post('/spaces', authenticate, requireRole('manager', 'admin'), validateBody(createSpaceSchema), SpacesController.createSpace);
router.patch('/spaces/:id', authenticate, requireRole('manager', 'admin'), validateBody(updateSpaceSchema), SpacesController.updateSpace);
router.delete('/spaces/:id', authenticate, requireRole('manager', 'admin'), SpacesController.deleteSpace);

// ==============================================================================
// RÉSERVATIONS (BOOKINGS)
// ==============================================================================
router.post('/bookings', authenticate, validateBody(createBookingSchema), BookingsController.createBooking);
router.get('/bookings/user', authenticate, BookingsController.getUserBookings);
router.patch('/bookings/:id/cancel', authenticate, BookingsController.cancelBooking);
router.patch('/bookings/:id/status', authenticate, requireRole('manager', 'admin'), validateBody(updateBookingStatusSchema), BookingsController.updateBookingStatus);

// ==============================================================================
// RECOMMANDATIONS IA (CLAUDE API)
// ==============================================================================
router.get('/recommendations', authenticate, RecommendationsController.getRecommendations);
router.post('/recommendations/:id/click', authenticate, RecommendationsController.markClicked);
router.post('/recommendations/feedback', authenticate, RecommendationsController.submitFeedback);

// ==============================================================================
// AVIS & NOTATIONS (REVIEWS)
// ==============================================================================
router.post('/reviews', authenticate, validateBody(createReviewSchema), ReviewsController.createReview);

// ==============================================================================
// GESTIONNAIRE & ANALYTICS (MANAGER DASHBOARD)
// ==============================================================================
router.get('/manager/dashboard', authenticate, requireRole('manager', 'admin'), ManagerController.getDashboard);
router.get('/manager/bookings', authenticate, requireRole('manager', 'admin'), ManagerController.getManagerBookings);
router.get('/manager/payments', authenticate, requireRole('manager', 'admin'), ManagerController.getPayments);

export default router;
