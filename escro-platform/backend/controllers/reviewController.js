import pool from '../config/database.js';

export const createReviewTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_review UNIQUE (reviewer_id, project_id)
      )
    `);
    console.log('[DEBUG] Reviews table created or already exists');
  } catch (err) {
    console.error('[DEBUG] Error creating reviews table:', err.message);
  }
};

export const createReview = async (req, res) => {
  try {
    await createReviewTable();
    
    const { reviewed_id, project_id, contract_id, rating, review_text } = req.body;
    const reviewer_id = req.user.id;
    
    if (!reviewed_id || !rating) {
      return res.status(400).json({ error: 'Missing required fields: reviewed_id and rating' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE reviewer_id = $1 AND project_id = $2',
      [reviewer_id, project_id]
    );
    
    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this project' });
    }
    
    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, reviewed_id, project_id, contract_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reviewer_id, reviewed_id, project_id, contract_id, rating, review_text || null]
    );
    
    res.status(201).json({
      success: true,
      review: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Failed to create review', details: err.message });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.profile_image_url as reviewer_avatar
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewed_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    // Calculate average rating
    const avgResult = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewed_id = $1',
      [userId]
    );
    
    res.json({
      reviews: result.rows,
      average_rating: avgResult.rows[0].avg_rating ? parseFloat(avgResult.rows[0].avg_rating).toFixed(1) : 0,
      total_reviews: parseInt(avgResult.rows[0].count) || 0
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews', details: err.message });
  }
};

export const getPendingReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get projects where user was a party but hasn't left a review yet
    const result = await pool.query(
      `SELECT p.id, p.title, p.client_id, p.expert_id, p.company_id, c.status as contract_status,
              u1.name as client_name, u2.name as expert_name, u3.name as company_name
       FROM projects p
       LEFT JOIN contracts c ON c.project_id = p.id AND c.contract_type = 'final'
       LEFT JOIN users u1 ON p.client_id = u1.id
       LEFT JOIN users u2 ON p.expert_id = u2.id
       LEFT JOIN users u3 ON p.company_id = u3.id
       WHERE c.status = 'accepted'
         AND (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)
         AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.reviewer_id = $1 AND r.project_id = p.id)
       ORDER BY c.accepted_at DESC
       LIMIT 20`,
      [userId]
    );
    
    // Add reviewable user info
    const pendingReviews = result.rows.map(row => {
      let reviewableUser = null;
      if (String(row.client_id) === String(userId)) {
        reviewableUser = row.expert_id ? { id: row.expert_id, name: row.expert_name, role: 'expert' } : 
                         row.company_id ? { id: row.company_id, name: row.company_name, role: 'company' } : null;
      } else {
        reviewableUser = { id: row.client_id, name: row.client_name, role: 'client' };
      }
      
      return {
        project_id: row.id,
        project_title: row.title,
        reviewable_user: reviewableUser
      };
    }).filter(p => p.reviewable_user);
    
    res.json({ pending_reviews: pendingReviews });
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    res.status(500).json({ error: 'Failed to fetch pending reviews', details: err.message });
  }
};
