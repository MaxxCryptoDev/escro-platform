import pool from '../config/database.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: parseInt(countResult.rows[0].unread_count)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
