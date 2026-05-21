import pool from '../config/database.js';
import trustProfileService from '../services/trustProfileService.js';
import { logAdminAction } from '../services/adminAuditService.js';

export const createVerificationCall = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
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
        // For individuals, the identity call IS the full KYC — flip kyc_status now.
        // For expert/company, kyc_status remains Stripe-driven (Connect webhook).
        await pool.query(
          `UPDATE users SET kyc_status = 'verified'
           WHERE id = $1 AND role = 'individual' AND kyc_status != 'verified'`,
          [userId]
        );
        // Award 15 type2 identity points for completing the verification call
        await trustProfileService.awardType2Points(userId, 'video_call_approved');
        console.log('[VERIFICATION] Call completed, awarded type2 points for user:', userId);

        // Apply referral benefits (type1+type2 for referred user, type1 for referrer)
        await trustProfileService.applyReferralOnApproval(userId);

        // Final recalculation to pick up all point changes
        await trustProfileService.recalculateTrustProfile(userId, null, 'verification_call_completed');

        // Notify the user: KYC gate is now passed; they can connect Stripe
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, link, created_at)
           VALUES ($1, 'verification_approved', 'Identitate verificată',
                   'Apelul de verificare a fost aprobat. Poți acum activa contul Stripe Connect pentru a primi plăți.',
                   '/wallet', NOW())`,
          [userId]
        ).catch(e => console.warn('[notify verification]', e.message));
      } catch (err) {
        console.error('[VERIFICATION] Error updating trust profile:', err.message);
      }
    }

    await logAdminAction(req, `verification_call_${status}`, 'verification_call', id, {
      user_id: result.rows[0].user_id,
    });

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

// User confirms they understand they'll be called for KYC verification.
// Body may include a phone number — if provided, it overrides the registered phone.
// Marks the user as acknowledged + auto-schedules a verification call (admin picks up from "Apeluri identitate" tab).
export const acknowledgeVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const phone = (req.body?.phone || '').trim();

    if (!phone || phone.length < 6) {
      return res.status(400).json({ success: false, error: 'Număr de telefon invalid.' });
    }

    // Idempotent: stamp acknowledgement + update phone (even if previously set, allow correction)
    await pool.query(
      `UPDATE users
       SET phone = $2,
           verification_call_acknowledged_at = COALESCE(verification_call_acknowledged_at, NOW())
       WHERE id = $1`,
      [userId, phone]
    );

    // Auto-schedule a call entry for admin to follow up (only if none exists)
    const existing = await pool.query(
      `SELECT id FROM verification_calls WHERE user_id = $1 AND status IN ('scheduled','pending') LIMIT 1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      // Use today as a placeholder scheduled date; admin can reschedule from dashboard.
      await pool.query(
        `INSERT INTO verification_calls (user_id, scheduled_date, scheduled_time, notes, status)
         VALUES ($1, CURRENT_DATE, '09:00', 'Auto-scheduled on user acknowledgement', 'scheduled')`,
        [userId]
      ).catch(e => console.warn('[ack verify schedule]', e.message));
    }

    // Notify admin so they know there's a new call to make
    const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`);
    const adminId = adminRes.rows[0]?.id;
    if (adminId) {
      const userInfo = await pool.query(`SELECT name, phone, role FROM users WHERE id = $1`, [userId]);
      const u = userInfo.rows[0];
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'verification_pending', 'Apel KYC de programat',
                 $2, '/admin/dashboard?tab=calls', NOW())`,
        [adminId, `Utilizatorul ${u?.name || userId} (${u?.role || ''}) a confirmat telefonul ${u?.phone || '—'} și așteaptă apel de verificare.`]
      ).catch(() => {});
    }

    res.json({ success: true, acknowledged_at: new Date().toISOString() });
  } catch (error) {
    console.error('[acknowledgeVerification]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
