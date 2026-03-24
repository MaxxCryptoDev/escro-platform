import express from 'express';
import { 
  createExpertPostedTask,
  getMyPostedTasks,
  getProjectTaskRequests,
  claimExpertPostedTask
} from '../controllers/expertPostedTaskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Expert creates/posts a task (protected, expert only)
router.post('/', protect, async (req, res, next) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ error: 'Only experts can post tasks' });
  }
  next();
}, createExpertPostedTask);

// Get my posted tasks
router.get('/my-tasks', protect, async (req, res, next) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ error: 'Only experts can view posted tasks' });
  }
  next();
}, getMyPostedTasks);

// Company claims an expert-posted task
router.post('/claim', protect, async (req, res, next) => {
  if (req.user.role !== 'client' && req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can claim tasks' });
  }
  next();
}, claimExpertPostedTask);

// Get task requests/claims for a project (for both expert and company views)
router.get('/project/:projectId', protect, getProjectTaskRequests);

export default router;
