import express from 'express';
import {
  createExpertPostedTask,
  getMyPostedTasks,
} from '../controllers/expertPostedTaskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, async (req, res, next) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ error: 'Only experts can post tasks' });
  }
  next();
}, createExpertPostedTask);

router.get('/my-tasks', protect, async (req, res, next) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ error: 'Only experts can view posted tasks' });
  }
  next();
}, getMyPostedTasks);

// /claim and /project/:projectId removed — bid flow not part of platform

export default router;
