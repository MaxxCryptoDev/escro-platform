import pool from '../config/database.js';
import { logAdminAction } from '../services/adminAuditService.js';

// Public: current T&C version (used by /terms page + register flow)
export const getCurrentTerms = async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, version, content, summary, effective_date
       FROM terms_versions WHERE is_current = TRUE LIMIT 1`
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'No current terms version found' });
    }
    res.json({ terms: r.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Protected: check if logged-in user needs to accept new version
export const checkUserTerms = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [currentRes, userRes] = await Promise.all([
      pool.query(`SELECT version, summary, effective_date FROM terms_versions WHERE is_current = TRUE LIMIT 1`),
      pool.query(`SELECT accepted_terms_version, accepted_terms_at FROM users WHERE id = $1`, [userId]),
    ]);
    const current = currentRes.rows[0];
    const user = userRes.rows[0];
    if (!current) return res.json({ requires_acceptance: false });
    const requires = user?.accepted_terms_version !== current.version;
    res.json({
      requires_acceptance: requires,
      current_version: current.version,
      current_summary: current.summary,
      current_effective_date: current.effective_date,
      user_version: user?.accepted_terms_version || null,
      user_accepted_at: user?.accepted_terms_at || null,
    });
  } catch (err) {
    next(err);
  }
};

// Protected: user accepts the currently-active version
export const acceptCurrentTerms = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(`SELECT version FROM terms_versions WHERE is_current = TRUE LIMIT 1`);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'No current terms version' });
    }
    const currentVersion = r.rows[0].version;
    await pool.query(
      `UPDATE users SET accepted_terms_version = $1, accepted_terms_at = NOW() WHERE id = $2`,
      [currentVersion, userId]
    );
    res.json({ success: true, accepted_version: currentVersion });
  } catch (err) {
    next(err);
  }
};

// Admin: list all T&C versions
export const listTermsVersions = async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT t.id, t.version, t.summary, t.effective_date, t.is_current, t.created_at,
              u.name as created_by_name,
              (SELECT COUNT(*) FROM users WHERE accepted_terms_version = t.version) AS users_accepted
       FROM terms_versions t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.effective_date DESC`
    );
    res.json({ versions: r.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: get full content of a specific version
export const getTermsVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await pool.query(`SELECT * FROM terms_versions WHERE id = $1`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ terms: r.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: publish a new T&C version (demotes current, marks new as current)
export const publishTermsVersion = async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const { version, content, summary } = req.body;
    if (!version || !content) {
      return res.status(400).json({ error: 'version și content sunt obligatorii' });
    }
    const cleanVersion = String(version).trim();
    if (!/^[\w.\-]{1,20}$/.test(cleanVersion)) {
      return res.status(400).json({ error: 'Format versiune invalid (max 20 caractere alfanumerice/._-)' });
    }
    if (String(content).length > 200000) {
      return res.status(400).json({ error: 'Conținut prea lung (max 200.000 caractere).' });
    }
    if (summary && String(summary).length > 5000) {
      return res.status(400).json({ error: 'Rezumat prea lung (max 5.000 caractere).' });
    }

    await dbClient.query('BEGIN');

    // Lock all is_current rows for serialization under concurrent publishes
    await dbClient.query(`SELECT id FROM terms_versions WHERE is_current = TRUE FOR UPDATE`);

    // Check version doesn't already exist
    const exists = await dbClient.query(`SELECT 1 FROM terms_versions WHERE version = $1`, [cleanVersion]);
    if (exists.rows.length > 0) {
      await dbClient.query('ROLLBACK');
      return res.status(409).json({ error: `Versiunea "${cleanVersion}" există deja.` });
    }

    // Demote previous current
    await dbClient.query(`UPDATE terms_versions SET is_current = FALSE WHERE is_current = TRUE`);
    // Insert new version as current
    const ins = await dbClient.query(
      `INSERT INTO terms_versions (version, content, summary, is_current, created_by, effective_date)
       VALUES ($1, $2, $3, TRUE, $4, NOW()) RETURNING *`,
      [cleanVersion, content, summary || null, req.user.id]
    );

    await dbClient.query('COMMIT');

    await logAdminAction(req, 'terms_publish', 'terms_version', ins.rows[0].id, {
      version: cleanVersion,
      summary: summary || null,
    });

    res.status(201).json({ success: true, terms: ins.rows[0] });
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    dbClient.release();
  }
};
