import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// In-memory cache: userId -> { ok: bool, role: string, expires: timestamp }
// Avoids hitting DB on every request. TTL 60s — short enough that admin suspension takes effect.
const userStatusCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function isUserActive(userId) {
  const cached = userStatusCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached;
  try {
    const r = await pool.query(
      `SELECT role, deleted_at, kyc_status FROM users WHERE id = $1`,
      [userId]
    );
    if (r.rows.length === 0) {
      const result = { ok: false, role: null, expires: Date.now() + CACHE_TTL_MS };
      userStatusCache.set(userId, result);
      return result;
    }
    const u = r.rows[0];
    const ok = !u.deleted_at && u.kyc_status !== 'suspended';
    const result = { ok, role: u.role, expires: Date.now() + CACHE_TTL_MS };
    userStatusCache.set(userId, result);
    // Keep cache size bounded
    if (userStatusCache.size > 10000) {
      const cutoff = Date.now();
      for (const [k, v] of userStatusCache.entries()) {
        if (v.expires < cutoff) userStatusCache.delete(k);
      }
    }
    return result;
  } catch (err) {
    console.warn('[auth cache] DB error:', err.message);
    // On DB error, fail-open with cached or refuse
    return { ok: false, role: null, expires: Date.now() + 5000 };
  }
}

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  // Reject download-scoped tokens (audience='upload') — they're only valid for /uploads/*
  // and must never grant session access to API endpoints.
  if (decoded.aud === 'upload') {
    return res.status(401).json({ message: 'Download-only token cannot be used for API access.' });
  }

  // Re-verify user is still active (not soft-deleted or suspended) — token may be from before suspension
  const status = await isUserActive(decoded.id);
  if (!status.ok) {
    return res.status(401).json({ message: 'Contul a fost dezactivat sau suspendat.' });
  }

  // Use latest role from DB (admin may have changed role)
  req.user = { ...decoded, role: status.role || decoded.role };
  next();
};

// Allow controllers to invalidate cached status (e.g., after admin suspends user)
export const invalidateUserStatusCache = (userId) => {
  if (userId) userStatusCache.delete(String(userId));
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const expertOnly = (req, res, next) => {
  if (req.user.role !== 'expert') {
    return res.status(403).json({ message: 'Expert access required' });
  }
  next();
};

export const companyOnly = (req, res, next) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ message: 'Company access required' });
  }
  next();
};
