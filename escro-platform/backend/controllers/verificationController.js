import pool from '../config/database.js';
import trustProfileService from '../services/trustProfileService.js';

export const createVerificationCall = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    console.log('=== Verification Call Request ===');
    console.log('User object:', req.user);
    console.log('User ID:', userId);
    console.log('Request body:', req.body);
    
    if (!userId) {
      console.log('ERROR: No user ID found');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No user ID' 
      });
    }

    const { scheduled_date, scheduled_time, notes } = req.body;

    // Validare input
    if (!scheduled_date || !scheduled_time) {
      console.log('Missing date or time');
      return res.status(400).json({ 
        success: false, 
        error: 'Date and time are required' 
      });
    }

    // Check if user already has a scheduled call
    const existingCall = await pool.query(
      'SELECT id FROM verification_calls WHERE user_id = $1 AND status = $2',
      [userId, 'scheduled']
    );

    console.log('Existing calls check:', existingCall.rows);

    if (existingCall.rows.length > 0) {
      console.log('User already has scheduled call');
      return res.status(400).json({ 
        success: false, 
        error: 'You already have a scheduled verification call' 
      });
    }

    // Insert verification call
    const query = `
      INSERT INTO verification_calls (user_id, scheduled_date, scheduled_time, notes, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, scheduled_date, scheduled_time, notes, status, created_at
    `;

    const result = await pool.query(query, [
      userId,
      scheduled_date,
      scheduled_time,
      notes || null,
      'scheduled'
    ]);

    console.log('Verification call created:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Verification call scheduled successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('=== ERROR scheduling verification call ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to schedule verification call'
    });
  }
};

export const getVerificationCall = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT id, user_id, scheduled_date, scheduled_time, notes, status, created_at, updated_at
      FROM verification_calls
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching verification call:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const getAllVerificationCalls = async (req, res) => {
  try {
    const query = `
      SELECT 
        vc.id, 
        vc.user_id, 
        vc.scheduled_date, 
        vc.scheduled_time, 
        vc.notes, 
        vc.status, 
        vc.created_at, 
        vc.updated_at,
        u.name,
        u.email,
        u.phone,
        u.company,
        u.kyc_status
      FROM verification_calls vc
      JOIN users u ON vc.user_id = u.id
      ORDER BY vc.scheduled_date ASC, vc.scheduled_time ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching verification calls:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const updateVerificationCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validare status
    const validStatuses = ['scheduled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
    }

    const query = `
      UPDATE verification_calls
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, user_id, scheduled_date, scheduled_time, notes, status, created_at, updated_at
    `;

    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Verification call not found' 
      });
    }

    // If call is completed, update trust profile verification
    if (status === 'completed') {
      const userId = result.rows[0].user_id;
      try {
        await pool.query(
          `UPDATE trust_profiles SET has_verification_call = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [userId]
        );
        await trustProfileService.recalculateTrustProfile(userId, null, 'verification_call_completed');
        console.log('[VERIFICATION] Call completed, updated trust profile for user:', userId);
        
        // Apply referral benefits after verification is completed
        await trustProfileService.applyReferralOnApproval(userId);
        console.log('[REFERRAL] Referral benefits applied for user:', userId);
      } catch (err) {
        console.error('[VERIFICATION] Error updating trust profile:', err.message);
      }
    }

    res.json({
      success: true,
      message: 'Verification call updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating verification call:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
