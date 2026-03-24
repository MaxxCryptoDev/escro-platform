import express from 'express';
import { 
  createVerificationCall, 
  getVerificationCall, 
  getAllVerificationCalls,
  updateVerificationCallStatus
} from '../controllers/verificationController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Create a verification call (protected, for users)
router.post('/', protect, createVerificationCall);

// Get my verification call
router.get('/my-call', protect, getVerificationCall);

// Get all verification calls (admin only)
router.get('/', protect, adminOnly, getAllVerificationCalls);

// Update verification call status (admin only)
router.put('/:id/status', protect, adminOnly, updateVerificationCallStatus);

export default router;
