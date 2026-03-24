import pool from '../config/database.js';

export const sendMessage = async (req, res, next) => {
  try {
    const { project_id, recipient_id, content } = req.body;
    const sender_id = req.user.id;

    const result = await pool.query(
      `INSERT INTO messages (project_id, sender_id, recipient_id, content, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [project_id, sender_id, recipient_id, content]
    );

    res.status(201).json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectMessages = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const result = await pool.query(
      `SELECT m.*, 
              u_sender.name as sender_name,
              u_sender.role as sender_role,
              u_sender.profile_image_url as sender_avatar,
              u_sender.company as sender_company
       FROM messages m
       LEFT JOIN users u_sender ON m.sender_id = u_sender.id
       WHERE m.project_id = $1
       ORDER BY m.created_at ASC`,
      [project_id]
    );

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { message_id } = req.params;

    const result = await pool.query(
      `UPDATE messages SET read_at = NOW() WHERE id = $1 RETURNING *`,
      [message_id]
    );

    res.json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
