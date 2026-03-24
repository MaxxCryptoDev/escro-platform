import express from 'express';
import { protect, clientOnly } from '../middleware/auth.js';
import {
  createClientPostedTask,
  getMyPostedTasks,
  bidOnClientPostedTask,
  getTaskBids
} from '../controllers/clientPostedTaskController.js';

const router = express.Router();

/**
 * POST /api/companies/posted-tasks
 * Company posts a task for experts to bid on
 */
router.post('/', protect, clientOnly, createClientPostedTask);

/**
 * GET /api/companies/posted-tasks/my-tasks
 * Get company's own posted tasks
 */
router.get('/my-tasks', protect, clientOnly, getMyPostedTasks);

/**
 * GET /api/companies/posted-tasks/project/:projectId/bids
 * Get all bids/proposals for this company's posted task
 */
router.get('/project/:projectId/bids', protect, clientOnly, getTaskBids);

/**
 * POST /api/companies/posted-tasks/bid
 * Expert/Other company bids on a company-posted task
 */
router.post('/bid', protect, bidOnClientPostedTask);

export default router;
