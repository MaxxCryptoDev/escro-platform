import express from 'express';
import { register, login, getCurrentUser, getUserContract } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);
router.get('/contract', protect, getUserContract);

export default router;
