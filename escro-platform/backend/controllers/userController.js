import pool from '../config/database.js';
import trustProfileHooks from '../services/trustProfileHooks.js';
import trustProfileService from '../services/trustProfileService.js';

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Getting profile for user:', userId);

    const query = `
      SELECT 
        id,
        name,
        email,
        role,
        expertise,
        bio,
        phone,
        company,
        profile_image_url,
        portfolio_description,
        industry,
        experience,
        kyc_status,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);
    console.log('Profile query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const trustProfile = await trustProfileService.getTrustProfileById(userId);

    res.json({
      success: true,
      user: result.rows[0],
      trustProfile: trustProfile || null
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.company,
        u.expertise,
        u.industry,
        u.experience,
        u.bio,
        u.phone,
        u.profile_image_url,
        u.portfolio_description,
        u.created_at,
        u.kyc_status,
        COALESCE(
          (SELECT COUNT(*) FROM projects p 
           WHERE (p.client_id = u.id OR p.expert_id = u.id OR p.company_id = u.id) 
           AND p.status = 'completed'), 0
        ) as completed_projects,
        COALESCE(
          (SELECT AVG(r.rating) FROM reviews r 
           WHERE r.reviewed_id = u.id), 0
        ) as rating,
        COALESCE(
          (SELECT COUNT(*) FROM reviews r 
           WHERE r.reviewed_id = u.id), 0
        ) as reviews_count
      FROM users u
      WHERE u.role IN ('client', 'expert', 'company')
      AND u.kyc_status = 'verified'
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  const { name, email, expertise, bio, phone, company, profile_image_url, portfolio_description, industry, experience } = req.body;
  const userId = req.user.id;

  try {
    const oldProfile = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const wasProfileComplete = trustProfileService.isProfileCompleted(oldProfile.rows[0]);

    // Check if email is already taken (by another user)
    if (email && email !== req.user.email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
    }

    // Update user profile
    const query = `
      UPDATE users 
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        expertise = COALESCE($3, expertise),
        bio = COALESCE($4, bio),
        phone = COALESCE($5, phone),
        company = COALESCE($6, company),
        profile_image_url = COALESCE($7, profile_image_url),
        portfolio_description = COALESCE($8, portfolio_description),
        industry = COALESCE($9, industry),
        experience = COALESCE($10, experience),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING id, name, email, role, expertise, bio, phone, company, profile_image_url, portfolio_description, industry, experience, created_at, updated_at
    `;

    const result = await pool.query(query, [
      name,
      email,
      expertise,
      bio,
      phone,
      company,
      profile_image_url,
      portfolio_description,
      industry,
      experience,
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newProfile = result.rows[0];
    const isProfileComplete = trustProfileService.isProfileCompleted(newProfile);
    
    let pointsAwarded = [];
    
    if (!wasProfileComplete && isProfileComplete) {
      const awardResult = await trustProfileService.awardType2Points(userId, 'profile_completed');
      if (awardResult.success) {
        pointsAwarded.push({
          type: 'profile_completed',
          points: awardResult.points_awarded,
          description: 'Profil complet'
        });
        await createNotification(userId, 'points_earned', 'Puncte de identitate acordate!', `Ai primit ${awardResult.points_awarded} puncte pentru profil complet.`);
      }
    }

    await trustProfileHooks.triggerProfileUpdate(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: newProfile,
      pointsAwarded
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function createNotification(userId, type, title, message) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, type, title, message]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
