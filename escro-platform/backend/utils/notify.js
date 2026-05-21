import { emitNotification } from '../socket.js';
import { sendEmailIfEnabled } from '../services/emailService.js';

// In-memory throttle: per-user max 30 notifications / 60 seconds (covers WebSocket spam patterns).
// For multi-instance deploy, replace with Redis. For single-process this is sufficient.
const userNotifWindow = new Map();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(userId) {
  const now = Date.now();
  const arr = userNotifWindow.get(userId) || [];
  const recent = arr.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    userNotifWindow.set(userId, recent);
    return true;
  }
  recent.push(now);
  userNotifWindow.set(userId, recent);
  // Opportunistic cleanup to keep map small
  if (userNotifWindow.size > 5000) {
    for (const [k, v] of userNotifWindow.entries()) {
      const fresh = v.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) userNotifWindow.delete(k);
      else userNotifWindow.set(k, fresh);
    }
  }
  return false;
}

/**
 * Insert a notification into DB and emit via Socket.io to the user's room.
 * Returns null if user disabled in-app notifications OR rate limit hit.
 *
 * Optional 6th arg `options` can carry:
 *   - link: string — clickable target shown in the in-app bell
 *   - emailTemplate: string — key in services/emailService.js templates map
 *   - emailData: object — passed to the template; `name` is auto-injected by sendEmailIfEnabled
 *
 * Backwards-compatible: passing a plain string as the 6th arg still works as `link`.
 */
export async function notify(pool, userId, type, title, message, options = null) {
  const opts = typeof options === 'string' || options === null
    ? { link: options }
    : options;
  const { link = null, emailTemplate = null, emailData = null } = opts;

  const prefRes = await pool.query(`SELECT in_app_notifications FROM users WHERE id = $1`, [userId]);
  if (prefRes.rows[0]?.in_app_notifications === false) return null;

  if (isRateLimited(userId)) {
    console.warn(`[notify] Rate-limited user ${userId} (${type})`);
    return null;
  }

  const r = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, link, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [userId, type, title, message, link]
  );
  const notification = r.rows[0];
  emitNotification(userId, notification);

  if (emailTemplate) {
    // Fire-and-forget: email failure must not break the notification flow
    sendEmailIfEnabled(pool, userId, emailTemplate, emailData || {}).catch(err => {
      console.error(`[notify] email dispatch failed for ${userId}/${type}:`, err.message);
    });
  }

  return notification;
}
