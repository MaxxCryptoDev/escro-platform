import pool from '../config/database.js';
import { emitMessage } from '../socket.js';

const isProjectParticipant = async (userId, userRole, projectId) => {
  if (userRole === 'admin') return true;
  const result = await pool.query(
    'SELECT client_id, expert_id, company_id FROM projects WHERE id = $1',
    [projectId]
  );
  if (result.rows.length === 0) return null;
  const p = result.rows[0];
  return String(p.client_id) === String(userId) ||
         String(p.expert_id) === String(userId) ||
         String(p.company_id) === String(userId);
};

const PROJECT_LOCKED_STATUSES = ['completed', 'cancelled', 'rejected'];

export const sendMessage = async (req, res, next) => {
  try {
    const { project_id, recipient_id, content } = req.body;
    const sender_id = req.user.id;

    // Validate content
    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'Mesajul nu poate fi gol.' });
    }
    if (content.length > 10000) {
      return res.status(400).json({ message: 'Mesajul depășește 10.000 caractere.' });
    }

    const access = await isProjectParticipant(sender_id, req.user.role, project_id);
    if (access === null) return res.status(404).json({ message: 'Project not found' });
    if (!access) return res.status(403).json({ message: 'Access denied' });

    // Block new messages when the project is locked (completed, cancelled, rejected).
    // Admin can still post (for moderation/dispute clarifications).
    if (req.user.role !== 'admin') {
      const statusRes = await pool.query('SELECT status FROM projects WHERE id = $1', [project_id]);
      const projStatus = statusRes.rows[0]?.status;
      if (projStatus && PROJECT_LOCKED_STATUSES.includes(projStatus)) {
        return res.status(412).json({
          message: `Conversația este blocată: proiectul este ${projStatus === 'completed' ? 'finalizat' : projStatus === 'cancelled' ? 'anulat' : 'respins'}. Poți doar vizualiza mesajele anterioare.`,
          locked: true,
          project_status: projStatus,
        });
      }
    }

    // Verify recipient is also a project party (anti-DB pollution: prevent sender
    // from posting messages with arbitrary recipient_id pointing to non-party users)
    if (recipient_id) {
      const recipCheck = await pool.query(
        `SELECT 1 FROM projects WHERE id = $1
           AND ($2::uuid IN (client_id, expert_id, company_id)
                OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin'))
         LIMIT 1`,
        [project_id, recipient_id]
      );
      if (recipCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Recipient nu este parte la proiect.' });
      }
    }

    const result = await pool.query(
      `WITH ins AS (
         INSERT INTO messages (project_id, sender_id, recipient_id, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *
       )
       SELECT ins.*, u.name as sender_name, u.role as sender_role, u.profile_image_url as sender_avatar, u.company as sender_company
       FROM ins JOIN users u ON ins.sender_id = u.id`,
      [project_id, sender_id, recipient_id, content]
    );

    const msg = result.rows[0];
    // Broadcast to everyone in the project room (real-time)
    emitMessage(project_id, msg);

    res.status(201).json({
      success: true,
      message: msg
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectMessages = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before || null; // cursor: created_at timestamp

    const access = await isProjectParticipant(userId, req.user.role, project_id);
    if (access === null) return res.status(404).json({ message: 'Project not found' });
    if (!access) return res.status(403).json({ message: 'Access denied' });

    const params = [project_id, limit + 1];
    let cursorClause = '';
    if (before) {
      params.push(before);
      cursorClause = `AND m.created_at < $${params.length}`;
    }

    const result = await pool.query(
      `SELECT m.*,
              u_sender.name as sender_name,
              u_sender.role as sender_role,
              u_sender.profile_image_url as sender_avatar,
              u_sender.company as sender_company
       FROM messages m
       LEFT JOIN users u_sender ON m.sender_id = u_sender.id
       WHERE m.project_id = $1 ${cursorClause}
       ORDER BY m.created_at DESC
       LIMIT $2`,
      params
    );

    const rows = result.rows;
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse(); // oldest first for chat display

    res.json({
      success: true,
      messages,
      has_more: hasMore,
      next_cursor: hasMore ? messages[0]?.created_at : null,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // List all projects where the user participated, with last message + unread count + counterparty.
    // For admin: returns ALL conversations across the platform.
    const projectFilter = isAdmin
      ? ''
      : `AND (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)`;
    const params = isAdmin ? [] : [userId];

    const result = await pool.query(
      `WITH project_messages AS (
         SELECT p.id as project_id, p.title, p.status, p.client_id, p.expert_id, p.company_id,
                p.assignment_type, p.task_id,
                (SELECT MAX(m.created_at) FROM messages m WHERE m.project_id = p.id) as last_message_at,
                (SELECT content FROM messages m WHERE m.project_id = p.id ORDER BY created_at DESC LIMIT 1) as last_message_content,
                (SELECT sender_id FROM messages m WHERE m.project_id = p.id ORDER BY created_at DESC LIMIT 1) as last_sender_id,
                (SELECT COUNT(*) FROM messages m WHERE m.project_id = p.id ${isAdmin ? '' : `AND m.recipient_id = $1`} AND m.read_at IS NULL) as unread_count
         FROM projects p
         WHERE EXISTS (SELECT 1 FROM messages WHERE project_id = p.id)
           ${projectFilter}
       )
       SELECT pm.*,
              u_client.name as client_name, u_client.profile_image_url as client_avatar,
              u_expert.name as expert_name, u_expert.profile_image_url as expert_avatar,
              u_company.name as company_name, u_company.profile_image_url as company_avatar
       FROM project_messages pm
       LEFT JOIN users u_client ON pm.client_id = u_client.id
       LEFT JOIN users u_expert ON pm.expert_id = u_expert.id
       LEFT JOIN users u_company ON pm.company_id = u_company.id
       ORDER BY pm.last_message_at DESC NULLS LAST`,
      params
    );

    const conversations = result.rows.map(row => {
      // For the current user, the "counterparty" is whoever ELSE is on this project.
      let counterparty = null;
      if (isAdmin) {
        counterparty = { name: row.client_name || row.expert_name || row.company_name || 'Multi-party', avatar: row.client_avatar };
      } else if (String(row.client_id) === String(userId)) {
        counterparty = row.expert_id
          ? { id: row.expert_id, name: row.expert_name, avatar: row.expert_avatar, role: 'expert' }
          : row.company_id
          ? { id: row.company_id, name: row.company_name, avatar: row.company_avatar, role: 'company' }
          : null;
      } else if (String(row.expert_id) === String(userId) || String(row.company_id) === String(userId)) {
        counterparty = { id: row.client_id, name: row.client_name, avatar: row.client_avatar, role: 'client' };
      }
      return {
        project_id: row.project_id,
        project_title: row.title,
        project_status: row.status,
        assignment_type: row.assignment_type,
        task_id: row.task_id,
        counterparty,
        last_message_at: row.last_message_at,
        last_message_content: row.last_message_content,
        last_sender_is_me: String(row.last_sender_id) === String(userId),
        unread_count: parseInt(row.unread_count) || 0,
        locked: PROJECT_LOCKED_STATUSES.includes(row.status),
      };
    });

    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { message_id } = req.params;
    const userId = req.user.id;

    // Only the recipient can mark a message as read
    const result = await pool.query(
      `UPDATE messages SET read_at = NOW()
       WHERE id = $1 AND recipient_id = $2
       RETURNING *`,
      [message_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found or not authorized' });
    }

    res.json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
