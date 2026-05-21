import express from 'express';
import { protect, companyOnly } from '../middleware/auth.js';
import {
  createClientPostedTask,
  getMyPostedTasks,
} from '../controllers/clientPostedTaskController.js';

const router = express.Router();

router.post('/', protect, companyOnly, createClientPostedTask);
router.get('/my-tasks', protect, companyOnly, getMyPostedTasks);

// /bid and /project/:projectId/bids removed — bid flow not part of platform

export default router;
