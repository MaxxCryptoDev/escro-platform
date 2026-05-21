import pool from '../config/database.js';

/**
 * Insert a row in project_history for any project lifecycle event.
 * Fire-and-forget — failures are logged but don't block the parent transaction.
 */
export async function logProjectHistory(projectId, actorId, action, details = null, fieldChange = null) {
  try {
    await pool.query(
      `INSERT INTO project_history (project_id, actor_id, action, field_name, old_value, new_value, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        projectId,
        actorId || null,
        action,
        fieldChange?.field || null,
        fieldChange?.old != null ? String(fieldChange.old) : null,
        fieldChange?.new != null ? String(fieldChange.new) : null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (err) {
    console.warn('[projectHistory]', err.message);
  }
}
