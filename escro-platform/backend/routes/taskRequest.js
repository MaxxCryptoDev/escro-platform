import express from 'express';
import { 
  createTaskRequest, 
  getAllTaskRequests,
  getProjectTaskRequests,
  updateTaskRequestStatus,
  getMyTaskRequests
} from '../controllers/taskRequestController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Create a task request (protected, for users)
router.post('/', protect, createTaskRequest);

// Get my task requests
router.get('/my-requests', protect, getMyTaskRequests);

// Get task requests for a specific project
router.get('/project/:projectId', protect, getProjectTaskRequests);

// Update task request status (admin only)
router.put('/:requestId/status', protect, adminOnly, updateTaskRequestStatus);

// Get all task requests (admin only) - MUST be last
router.get('/', protect, adminOnly, getAllTaskRequests);

export default router;
