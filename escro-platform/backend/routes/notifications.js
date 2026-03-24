import express from 'express';
import { protect } from '../middleware/auth.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:notificationId/read', protect, markNotificationRead);
router.put('/read-all', protect, markAllNotificationsRead);

export default router;
