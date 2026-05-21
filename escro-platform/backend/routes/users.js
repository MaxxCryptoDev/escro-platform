import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { getProfile, getAllUsers, updateProfile } from '../controllers/userController.js';
import trustProfileService from '../services/trustProfileService.js';
import trustProfileHooks from '../services/trustProfileHooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profilesDir = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilesDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const ALLOWED_PROFILE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_PROFILE_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Doar fotografii JPG/PNG/WebP/GIF sunt acceptate.'));
  },
});

const router = express.Router();

const uploadDir = 'uploads/profiles';
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true });
}

const portfolioDir = 'uploads/portfolio';
if (!fs.existsSync(portfolioDir)){
  fs.mkdirSync(portfolioDir, { recursive: true });
}

const portfolioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, portfolioDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'portfolio-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const portfolioUpload = multer({
  storage: portfolioStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
  fileFilter: (req, file, cb) => {
    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else if (allowedVideoMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: images and videos'));
    }
  }
});

// Get current user profile
router.get('/profile', protect, getProfile);

// Get public profile — requires auth; strips email/phone for non-admins/non-self
router.get('/:userId/public-profile', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const isAdmin = req.user?.role === 'admin';
    const isSelf = String(req.user?.id) === String(userId);
    const showSensitive = isAdmin || isSelf;
    const sensitiveCols = showSensitive ? 'email, phone,' : '';

    const query = `
      SELECT
        id,
        name,
        ${sensitiveCols}
        profile_image_url,
        role,
        industry,
        expertise,
        experience,
        bio,
        company,
        kyc_status,
        verification_date,
        created_at,
        COALESCE(email_notifications, TRUE) AS email_notifications,
        COALESCE(in_app_notifications, TRUE) AS in_app_notifications,
        COALESCE(
          (SELECT COUNT(*) FROM projects p
           WHERE (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)
           AND p.status = 'completed'), 0
        ) as completed_projects
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const portfolioResult = await pool.query(
      `SELECT id, title, description, file_url, file_type, media_type, thumbnail_url, display_order, created_at, client_name, project_year, results, technologies, category, is_featured
       FROM portfolio_items WHERE user_id = $1 ORDER BY is_featured DESC, display_order ASC, created_at DESC`,
      [userId]
    );

    const user = result.rows[0];
    res.json({
      ...user,
      portfolio: portfolioResult.rows,
      rating: null,
      reviews_count: 0
    });
  } catch (err) {
    console.error('Error fetching public profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
});

// Get completed projects for a user
router.get('/:userId/completed-projects', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT p.id, p.title, p.description, p.budget_ron, p.status, p.created_at,
             p.client_id, p.expert_id, p.company_id,
             SPLIT_PART(u1.name, ' ', 1) as client_name, u1.company as client_company,
             SPLIT_PART(u2.name, ' ', 1) as expert_name, u2.company as expert_company,
             SPLIT_PART(u3.name, ' ', 1) as company_name, u3.company as company_company_name
      FROM projects p
      LEFT JOIN users u1 ON p.client_id = u1.id
      LEFT JOIN users u2 ON p.expert_id = u2.id
      LEFT JOIN users u3 ON p.company_id = u3.id
      WHERE p.status = 'completed'
        AND (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)
      ORDER BY p.updated_at DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({ projects: result.rows });
  } catch (err) {
    console.error('Error fetching completed projects:', err);
    res.status(500).json({ error: 'Failed to fetch completed projects' });
  }
});

// Get all users (for directory) - requires auth
router.get('/', protect, getAllUsers);

// Upload profile image
router.post('/profile-image', protect, upload.single('profile_image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const imageUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/profiles/${req.file.filename}`;
    
    // Check if user already has a profile photo
    const userCheck = await pool.query('SELECT profile_image_url FROM users WHERE id = $1', [req.user.id]);
    const hadProfilePhoto = userCheck.rows[0]?.profile_image_url && userCheck.rows[0].profile_image_url !== null;
    
    // Update the database with the new image URL
    const query = `
      UPDATE users 
      SET profile_image_url = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, profile_image_url
    `;
    
    const result = await pool.query(query, [imageUrl, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Award points if this is the first profile photo
    if (!hadProfilePhoto) {
      try {
        await trustProfileService.awardType2Points(req.user.id, 'profile_photo');
        await trustProfileHooks.triggerProfileUpdate(req.user.id);
        console.log('[PROFILE] Awarded profile photo points to user:', req.user.id);
      } catch (e) {
        console.log('[PROFILE] Could not award profile photo points:', e.message);
      }
    }
    
    res.json({ profile_image_url: imageUrl });
  } catch (err) {
    console.error('Error updating profile image:', err);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, company, expertise, bio, industry, experience, portfolio_description } = req.body;
    const userId = req.user.id;
    
    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           company = COALESCE($4, company),
           expertise = COALESCE($5, expertise),
           bio = COALESCE($6, bio),
           industry = COALESCE($7, industry),
           experience = COALESCE($8, experience),
           portfolio_description = COALESCE($9, portfolio_description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING id, name, email, role, phone, company, expertise, bio, industry, experience, profile_image_url, portfolio_description`,
      [name, email, phone, company, expertise, bio, industry, experience, portfolio_description, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if profile image was updated - award type2 points
    const hasProfileImage = result.rows[0].profile_image_url;
    if (hasProfileImage) {
      try {
        await trustProfileService.awardType2Points(userId, 'profile_photo');
      } catch (e) {
        console.log('Could not award profile photo points:', e.message);
      }
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Portfolio Routes
router.get('/portfolio', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM portfolio_items WHERE user_id = $1 ORDER BY is_featured DESC, display_order ASC, created_at DESC`,
      [userId]
    );
    res.json({ success: true, portfolio: result.rows });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

router.get('/:userId/portfolio', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, title, description, file_url, file_type, media_type, thumbnail_url, display_order, created_at, client_name, project_year, results, technologies, category, is_featured
       FROM portfolio_items WHERE user_id = $1 ORDER BY is_featured DESC, display_order ASC, created_at DESC`,
      [userId]
    );
    res.json({ success: true, portfolio: result.rows });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

router.post('/portfolio', protect, portfolioUpload.single('file'), async (req, res) => {
  try {
    const { title, description, thumbnail_url, client_name, project_year, results, technologies, category, is_featured } = req.body;
    const userId = req.user.id;
    
    let fileUrl = null;
    let fileType = null;
    let mediaType = null;
    let fileSize = null;
    
    if (req.file) {
      fileType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
      mediaType = req.file.mimetype;
      fileUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/portfolio/${req.file.filename}`;
      fileSize = req.file.size;
    }
    
    const result = await pool.query(
      `INSERT INTO portfolio_items (user_id, title, description, file_url, file_type, media_type, file_size, thumbnail_url, client_name, project_year, results, technologies, category, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [userId, title || 'Untitled', description || '', fileUrl, fileType, mediaType, fileSize, thumbnail_url || null, client_name || null, project_year || null, results || null, technologies || null, category || null, is_featured === 'true' || is_featured === true]
    );
    
    await trustProfileHooks.triggerPortfolioUpdate(userId);
    
    res.json({ success: true, portfolio_item: result.rows[0] });
  } catch (err) {
    console.error('Error uploading portfolio item:', err);
    res.status(500).json({ error: 'Failed to upload portfolio item' });
  }
});

// Reorder MUST be defined before /portfolio/:itemId (Express matches first)
router.put('/portfolio/reorder', protect, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user.id;
    for (const item of items) {
      await pool.query(
        `UPDATE portfolio_items SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
        [item.display_order, item.id, userId]
      );
    }
    res.json({ success: true, message: 'Portfolio reordered' });
  } catch (err) {
    console.error('Error reordering portfolio:', err);
    res.status(500).json({ error: 'Failed to reorder portfolio' });
  }
});

router.put('/portfolio/:itemId', protect, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, description, display_order, client_name, project_year, results, technologies, category, is_featured } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(
      `UPDATE portfolio_items 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           display_order = COALESCE($3, display_order),
           client_name = COALESCE($4, client_name),
           project_year = COALESCE($5, project_year),
           results = COALESCE($6, results),
           technologies = COALESCE($7, technologies),
           category = COALESCE($8, category),
           is_featured = COALESCE($9, is_featured),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [title, description, display_order, client_name, project_year, results, technologies, category, is_featured, itemId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }
    
    res.json({ success: true, portfolio_item: result.rows[0] });
  } catch (err) {
    console.error('Error updating portfolio item:', err);
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

router.delete('/portfolio/:itemId', protect, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `DELETE FROM portfolio_items WHERE id = $1 AND user_id = $2 RETURNING file_url`,
      [itemId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }
    
    // Try to delete the file
    try {
      const rawUrl = result.rows[0].file_url || '';
      const filePath = rawUrl.replace(/^https?:\/\/[^/]+\//, '');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.log('Could not delete file:', e.message);
    }
    
    res.json({ success: true, message: 'Portfolio item deleted' });
  } catch (err) {
    console.error('Error deleting portfolio item:', err);
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

router.put('/notification-preferences', protect, async (req, res) => {
  try {
    const { email_notifications, in_app_notifications } = req.body;
    await pool.query(
      `UPDATE users SET email_notifications = $1, in_app_notifications = $2 WHERE id = $3`,
      [email_notifications !== false, in_app_notifications !== false, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GDPR — export all data
router.get('/me/export-data', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    // GDPR export caps: hard limits per category to prevent OOM on heavy users
    const CAP = { projects: 5000, messages: 5000, notifications: 1000, payouts: 5000, reviews: 5000, disputes: 5000 };

    const [userRes, projectsRes, messagesRes, notifRes, payoutsRes, reviewsRes, disputesRes] = await Promise.all([
      pool.query(
        `SELECT id, name, email, role, phone, company, bio, expertise, industry, experience, kyc_status, created_at FROM users WHERE id = $1`,
        [uid]
      ),
      pool.query(
        `SELECT p.id, p.title, p.description, p.budget_ron, p.status, p.created_at
         FROM projects p WHERE p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1
         ORDER BY p.created_at DESC LIMIT ${CAP.projects}`,
        [uid]
      ),
      pool.query(
        `SELECT m.content, m.created_at, p.title AS project FROM messages m
         JOIN projects p ON m.project_id = p.id WHERE m.sender_id = $1
         ORDER BY m.created_at DESC LIMIT ${CAP.messages}`,
        [uid]
      ),
      pool.query(
        `SELECT type, title, message, created_at FROM notifications WHERE user_id = $1
         ORDER BY created_at DESC LIMIT ${CAP.notifications}`,
        [uid]
      ),
      pool.query(
        `SELECT amount_ron, status, requested_at FROM payout_requests WHERE user_id = $1
         ORDER BY requested_at DESC LIMIT ${CAP.payouts}`,
        [uid]
      ),
      pool.query(
        `SELECT rating, review_text, created_at FROM reviews WHERE reviewer_id = $1
         ORDER BY created_at DESC LIMIT ${CAP.reviews}`,
        [uid]
      ),
      pool.query(
        `SELECT md.reason, md.status, md.created_at FROM milestone_disputes md
         JOIN milestones m ON md.milestone_id = m.id
         JOIN projects p ON m.project_id = p.id
         WHERE md.raised_by = $1 OR p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1
         ORDER BY md.created_at DESC LIMIT ${CAP.disputes}`,
        [uid]
      ),
    ]);

    const truncated = [];
    if (projectsRes.rows.length === CAP.projects) truncated.push('projects');
    if (messagesRes.rows.length === CAP.messages) truncated.push('messages_sent');
    if (notifRes.rows.length === CAP.notifications) truncated.push('notifications');
    if (disputesRes.rows.length === CAP.disputes) truncated.push('disputes');

    const exportData = {
      exported_at: new Date().toISOString(),
      truncated_categories: truncated, // empty array if everything fit
      limits: CAP,
      user: userRes.rows[0],
      projects: projectsRes.rows,
      messages_sent: messagesRes.rows,
      notifications: notifRes.rows,
      payout_requests: payoutsRes.rows,
      reviews_given: reviewsRes.rows,
      disputes: disputesRes.rows,
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="escro-date-personale-${uid.substring(0, 8)}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Export eșuat.' });
  }
});

// GDPR — delete / anonymize account
router.delete('/me/account', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const userRes = await pool.query(`SELECT role FROM users WHERE id = $1`, [uid]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found.' });

    // Block deletion if user has active escrow funds
    const escrowCheck = await pool.query(
      `SELECT COUNT(*) FROM escrow_accounts ea JOIN projects p ON ea.project_id = p.id
       WHERE (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1) AND ea.status = 'held'`,
      [uid]
    );
    if (parseInt(escrowCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Nu poți șterge contul dacă există fonduri active în escrow.' });
    }

    const anon = `deleted_${uid.substring(0, 8)}`;
    await pool.query(
      `UPDATE users SET
         name = $1, email = $2, phone = NULL, bio = NULL, company = NULL,
         profile_image_url = NULL, cui = NULL,
         deleted_at = NOW(), kyc_status = 'rejected'
       WHERE id = $3`,
      [anon, `${anon}@deleted.escro`, uid]
    );
    res.json({ success: true, message: 'Contul a fost anonimizat și dezactivat.' });
  } catch (err) {
    res.status(500).json({ error: 'Ștergere eșuată.' });
  }
});

export default router;
