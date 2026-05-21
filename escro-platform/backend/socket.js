import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from './config/database.js';

let io = null;

async function userCanJoinProject(userId, role, projectId) {
  if (!projectId || typeof projectId !== 'string') return false;
  if (role === 'admin') return true;
  // Check projects table
  const r = await pool.query(
    `SELECT 1 FROM projects WHERE id = $1 AND (client_id = $2 OR expert_id = $2 OR company_id = $2)
     UNION ALL
     SELECT 1 FROM tasks WHERE id = $1 AND client_id = $2
     LIMIT 1`,
    [projectId, userId]
  ).catch(() => null);
  return !!(r && r.rows.length > 0);
}

// Set up Postgres LISTEN on 'new_notification' channel — emits to socket whenever any
// controller inserts into the notifications table (no need to call notify() helper).
async function setupNotificationListener() {
  try {
    const client = await pool.connect();
    client.on('notification', (msg) => {
      if (msg.channel !== 'new_notification' || !msg.payload) return;
      try {
        const payload = JSON.parse(msg.payload);
        emitNotification(payload.user_id, payload);
      } catch (e) {
        console.warn('[notify-listener] Parse error:', e.message);
      }
    });
    client.on('error', (err) => {
      console.error('[notify-listener] Connection error:', err.message);
    });
    await client.query('LISTEN new_notification');
    console.log('[STARTUP] Postgres LISTEN new_notification: active');
  } catch (err) {
    console.error('[notify-listener] Failed to setup:', err.message);
  }
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error('Invalid token'));
    }
    // Block suspended/deleted users from connecting (consistent with HTTP protect middleware)
    try {
      const r = await pool.query(
        `SELECT role, deleted_at, kyc_status FROM users WHERE id = $1`,
        [decoded.id]
      );
      if (r.rows.length === 0 || r.rows[0].deleted_at || r.rows[0].kyc_status === 'suspended') {
        return next(new Error('Account suspended'));
      }
      socket.user = { ...decoded, role: r.rows[0].role || decoded.role };
      next();
    } catch (err) {
      next(new Error('Auth check failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    socket.on('join_project', async (projectId) => {
      const allowed = await userCanJoinProject(userId, socket.user.role, projectId);
      if (!allowed) {
        socket.emit('join_project_denied', { projectId });
        return;
      }
      socket.join(`project:${projectId}`);
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {});
  });

  setupNotificationListener();

  return io;
}

// Emit a notification to a specific user
export function emitNotification(userId, notification) {
  if (!io) return;
  io.to(`user:${userId}`).emit('new_notification', notification);
}

// Emit a new chat message to everyone in the project room
export function emitMessage(projectId, message) {
  if (!io) return;
  io.to(`project:${projectId}`).emit('new_message', message);
}

// Emit a project/milestone status change to everyone in the project room
export function emitProjectUpdate(projectId, payload) {
  if (!io) return;
  io.to(`project:${projectId}`).emit('project_update', payload);
}

export function getIO() {
  return io;
}
