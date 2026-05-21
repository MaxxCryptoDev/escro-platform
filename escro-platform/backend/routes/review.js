import express from 'express';
import { protect } from '../middleware/auth.js';
import { createReview, getUserReviews, getPendingReviews, canReview, getMyGivenReviews } from '../controllers/reviewController.js';

const router = express.Router();

router.post('/', protect, createReview);
router.get('/pending', protect, getPendingReviews);
router.get('/my-given', protect, getMyGivenReviews);
router.get('/can-review/:projectId', protect, canReview);
router.get('/user/:userId', protect, getUserReviews);

export default router;
