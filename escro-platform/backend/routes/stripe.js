import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  initiateOnboarding,
  refreshOnboardingLink,
  getOnboardingStatus,
  createLoginLink
} from '../controllers/stripeOnboardingController.js';

const router = express.Router();

router.post('/onboarding', protect, initiateOnboarding);
router.post('/onboarding/refresh', protect, refreshOnboardingLink);
router.get('/status', protect, getOnboardingStatus);
router.post('/login-link', protect, createLoginLink);
// /webhook is mounted directly in server.js (needs raw body parser BEFORE express.json)

export default router;
