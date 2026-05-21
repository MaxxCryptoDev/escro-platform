import express from 'express';
import {
  createVerificationCall,
  getVerificationCall,
  getAllVerificationCalls,
  updateVerificationCallStatus,
  acknowledgeVerification,
} from '../controllers/verificationController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// User acknowledges they'll be called on the phone they registered (first-login gate)
router.post('/acknowledge', protect, acknowledgeVerification);

// Create a verification call (protected, for users)
router.post('/', protect, createVerificationCall);

// Get my verification call
router.get('/my-call', protect, getVerificationCall);

// Get all verification calls (admin only)
router.get('/', protect, adminOnly, getAllVerificationCalls);

// Update verification call status (admin only)
router.put('/:id/status', protect, adminOnly, updateVerificationCallStatus);

export default router;
