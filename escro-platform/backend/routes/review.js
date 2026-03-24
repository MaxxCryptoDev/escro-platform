import express from 'express';
import { protect } from '../middleware/auth.js';
import { createReview, getUserReviews, getPendingReviews } from '../controllers/reviewController.js';

const router = express.Router();

router.post('/', protect, createReview);
router.get('/user/:userId', getUserReviews);
router.get('/pending', protect, getPendingReviews);

export default router;
