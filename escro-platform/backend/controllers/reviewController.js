import pool from '../config/database.js';

// ── helpers ──────────────────────────────────────────────────────────────────

async function isProjectParticipant(userId, projectId) {
  const res = await pool.query(
    `SELECT client_id, expert_id, company_id, status FROM projects WHERE id = $1`,
    [projectId]
  );
  if (!res.rows.length) return null;
  const p = res.rows[0];
  const isParticipant = [p.client_id, p.expert_id, p.company_id].includes(userId);
  return isParticipant ? p : null;
}

// Determine who the reviewer should review (the other party)
function getReviewTarget(project, reviewerId) {
  const { client_id, expert_id, company_id } = project;
  if (String(reviewerId) === String(client_id)) {
    // Client reviews expert or company
    return expert_id || company_id || null;
  }
  // Expert/company reviews the client
  return client_id || null;
}

// ── POST /api/reviews ────────────────────────────────────────────────────────

export const createReview = async (req, res) => {
  try {
    const { reviewed_id, project_id, rating, review_text } = req.body;
    const reviewer_id = req.user.id;

    if (!reviewed_id || !project_id || !rating) {
      return res.status(400).json({ error: 'Câmpuri obligatorii: reviewed_id, project_id, rating' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating-ul trebuie să fie între 1 și 5' });
    }
    if (String(reviewer_id) === String(reviewed_id)) {
      return res.status(400).json({ error: 'Nu poți lăsa o recenzie pentru tine însuți' });
    }

    // Project must exist and user must be a participant
    const project = await isProjectParticipant(reviewer_id, project_id);
    if (!project) {
      return res.status(403).json({ error: 'Nu ești participant la acest proiect' });
    }

    // Project must be completed
    if (project.status !== 'completed') {
      return res.status(400).json({ error: 'Recenziile sunt disponibile doar pentru proiectele finalizate' });
    }

    // reviewed_id must be the correct other party
    const expectedTarget = getReviewTarget(project, reviewer_id);
    if (!expectedTarget || String(expectedTarget) !== String(reviewed_id)) {
      return res.status(400).json({ error: 'Utilizatorul indicat nu este partenerul tău în acest proiect' });
    }

    // Idempotency: already reviewed?
    const existing = await pool.query(
      `SELECT id FROM reviews WHERE reviewer_id = $1 AND project_id = $2`,
      [reviewer_id, project_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ai lăsat deja o recenzie pentru acest proiect' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, reviewed_id, project_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reviewer_id, reviewed_id, project_id, rating, review_text?.trim() || null]
    );

    res.status(201).json({ success: true, review: result.rows[0] });
  } catch (err) {
    console.error('Error creating review:', err);
    if (err.code === '23505') { // unique_review violation
      return res.status(400).json({ error: 'Ai lăsat deja o recenzie pentru acest proiect' });
    }
    res.status(500).json({ error: 'Eroare la crearea recenziei', details: err.message });
  }
};

// ── GET /api/reviews/user/:userId ────────────────────────────────────────────

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const [reviewsRes, statsRes] = await Promise.all([
      pool.query(
        `SELECT r.id, r.rating, r.review_text, r.created_at, r.project_id,
                u.name AS reviewer_name, u.profile_image_url AS reviewer_avatar, u.role AS reviewer_role,
                p.title AS project_title
         FROM reviews r
         LEFT JOIN users u ON r.reviewer_id = u.id
         LEFT JOIN projects p ON r.project_id = p.id
         WHERE r.reviewed_id = $1
         ORDER BY r.created_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT
           COALESCE(AVG(rating), 0) AS avg_rating,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE rating = 5) AS five_star,
           COUNT(*) FILTER (WHERE rating = 4) AS four_star,
           COUNT(*) FILTER (WHERE rating = 3) AS three_star,
           COUNT(*) FILTER (WHERE rating = 2) AS two_star,
           COUNT(*) FILTER (WHERE rating = 1) AS one_star
         FROM reviews WHERE reviewed_id = $1`,
        [userId]
      ),
    ]);

    const stats = statsRes.rows[0];
    res.json({
      reviews: reviewsRes.rows,
      average_rating: parseFloat(stats.avg_rating).toFixed(1),
      total_reviews: parseInt(stats.total),
      distribution: {
        5: parseInt(stats.five_star),
        4: parseInt(stats.four_star),
        3: parseInt(stats.three_star),
        2: parseInt(stats.two_star),
        1: parseInt(stats.one_star),
      },
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Eroare la obținerea recenziilor', details: err.message });
  }
};

// ── GET /api/reviews/pending ─────────────────────────────────────────────────

export const getPendingReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    // All completed projects where user is a party and hasn't reviewed yet
    const result = await pool.query(
      `SELECT
         p.id AS project_id,
         p.title AS project_title,
         p.client_id, p.expert_id, p.company_id,
         uc.name AS client_name, uc.profile_image_url AS client_avatar,
         ue.name AS expert_name, ue.profile_image_url AS expert_avatar,
         uco.name AS company_name, uco.profile_image_url AS company_avatar
       FROM projects p
       LEFT JOIN users uc  ON p.client_id  = uc.id
       LEFT JOIN users ue  ON p.expert_id  = ue.id
       LEFT JOIN users uco ON p.company_id = uco.id
       WHERE p.status = 'completed'
         AND (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)
         AND NOT EXISTS (
           SELECT 1 FROM reviews r
           WHERE r.reviewer_id = $1 AND r.project_id = p.id
         )
       ORDER BY p.updated_at DESC
       LIMIT 20`,
      [userId]
    );

    const pending = result.rows.map(row => {
      let target = null;
      const uid = String(userId);
      if (uid === String(row.client_id)) {
        if (row.expert_id) target = { id: row.expert_id, name: row.expert_name, avatar: row.expert_avatar, role: 'expert' };
        else if (row.company_id) target = { id: row.company_id, name: row.company_name, avatar: row.company_avatar, role: 'company' };
      } else {
        if (row.client_id) target = { id: row.client_id, name: row.client_name, avatar: row.client_avatar, role: 'client' };
      }
      return target ? { project_id: row.project_id, project_title: row.project_title, reviewable_user: target } : null;
    }).filter(Boolean);

    res.json({ pending_reviews: pending });
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    res.status(500).json({ error: 'Eroare la obținerea recenziilor în așteptare', details: err.message });
  }
};

// ── GET /api/reviews/can-review/:projectId ───────────────────────────────────

export const canReview = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await isProjectParticipant(userId, projectId);
    if (!project) return res.json({ can_review: false, reason: 'not_participant' });
    if (project.status !== 'completed') return res.json({ can_review: false, reason: 'not_completed' });

    const target = getReviewTarget(project, userId);
    if (!target) return res.json({ can_review: false, reason: 'no_target' });

    const existing = await pool.query(
      `SELECT id FROM reviews WHERE reviewer_id = $1 AND project_id = $2`,
      [userId, projectId]
    );
    if (existing.rows.length > 0) return res.json({ can_review: false, reason: 'already_reviewed', review_id: existing.rows[0].id });

    // Get target user info
    const targetUser = await pool.query(`SELECT id, name, profile_image_url, role FROM users WHERE id = $1`, [target]);

    res.json({
      can_review: true,
      reviewable_user: targetUser.rows[0] || null,
    });
  } catch (err) {
    console.error('Error checking review eligibility:', err);
    res.status(500).json({ error: 'Eroare la verificarea eligibilității recenziei' });
  }
};

// ── GET /api/reviews/my-given ─────────────────────────────────────────────────

export const getMyGivenReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at, r.project_id,
              u.name AS reviewed_name, u.profile_image_url AS reviewed_avatar,
              p.title AS project_title
       FROM reviews r
       LEFT JOIN users u ON r.reviewed_id = u.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la obținerea recenziilor tale' });
  }
};
