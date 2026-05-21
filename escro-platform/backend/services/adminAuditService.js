import pool from '../config/database.js';

export const logAdminAction = async (req, actionType, targetType, targetId, details = null) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return;
    const ip = req.ip || req.connection?.remoteAddress || null;
    await pool.query(
      `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, actionType, targetType, String(targetId), details ? JSON.stringify(details) : null, ip]
    );
  } catch (err) {
    console.warn('[audit]', err.message);
  }
};

export const getAdminAuditLog = async ({ adminId, targetType, targetId, limit = 50, offset = 0 } = {}) => {
  const where = [];
  const params = [];
  if (adminId) { params.push(adminId); where.push(`a.admin_id = $${params.length}`); }
  if (targetType) { params.push(targetType); where.push(`a.target_type = $${params.length}`); }
  if (targetId) { params.push(String(targetId)); where.push(`a.target_id = $${params.length}`); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  params.push(limit, offset);
  const res = await pool.query(
    `SELECT a.*, u.name as admin_name, u.email as admin_email
     FROM admin_actions a
     LEFT JOIN users u ON a.admin_id = u.id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return res.rows;
};
