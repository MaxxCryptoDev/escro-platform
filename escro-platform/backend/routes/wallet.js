import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getWalletBalance,
  getEarningsHistory,
  requestPayout,
  getPayoutHistory,
  cancelPayoutRequest
} from '../controllers/walletController.js';

const router = express.Router();

router.get('/balance', protect, getWalletBalance);
router.get('/earnings', protect, getEarningsHistory);
router.post('/payout', protect, requestPayout);
router.get('/payouts', protect, getPayoutHistory);
router.delete('/payout/:id', protect, cancelPayoutRequest);

export default router;
