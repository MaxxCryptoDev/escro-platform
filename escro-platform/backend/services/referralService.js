import pool from '../config/database.js';
import trustProfileService from './trustProfileService.js';

const generateReferralCode = async (userId) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ESC';
  let attempts = 0;
  const maxAttempts = 10;
  
  // Keep generating until we get a unique code
  while (attempts < maxAttempts) {
    code = 'ESC';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const existing = await pool.query(
      'SELECT id FROM referral_codes WHERE code = $1',
      [code]
    );
    
    if (existing.rows.length === 0) {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback with timestamp
  return 'ESC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 4).toUpperCase();
};

class ReferralService {
  async getOrCreateReferralCode(userId) {
    let result = await pool.query(
      'SELECT * FROM referral_codes WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      const code = await generateReferralCode(userId);
      result = await pool.query(
        `INSERT INTO referral_codes (user_id, code)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, code]
      );
    }

    return result.rows[0];
  }

  async getReferralCodeByUser(userId) {
    const result = await pool.query(
      'SELECT * FROM referral_codes WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    return result.rows[0] || null;
  }

  async getReferralCodeByCode(code) {
    const result = await pool.query(
      'SELECT * FROM referral_codes WHERE code = $1 AND is_active = TRUE',
      [code.toUpperCase()]
    );
    return result.rows[0] || null;
  }

  async validateReferralCode(code) {
    const referralCode = await this.getReferralCodeByCode(code);
    
    if (!referralCode) {
      return { valid: false, error: 'Invalid referral code' };
    }

    if (!referralCode.is_active) {
      return { valid: false, error: 'Referral code is no longer active' };
    }

    if (referralCode.usage_count >= referralCode.max_uses) {
      return { valid: false, error: 'Referral code has reached maximum usage limit' };
    }

    return { valid: true, referralCode };
  }

  async createReferral(referrerId, referredId, referralCodeId) {
    const result = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_id, referral_code_id, status)
       VALUES ($1, $2, $3, 'registered')
       ON CONFLICT (referrer_id, referred_id) DO NOTHING
       RETURNING *`,
      [referrerId, referredId, referralCodeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    await pool.query(
      'UPDATE referral_codes SET usage_count = usage_count + 1 WHERE id = $1',
      [referralCodeId]
    );

    return result.rows[0];
  }

  async processReferralOnRegistration(referredEmail, referredId, referralCode) {
    if (!referralCode || referralCode.trim() === '') {
      return null;
    }

    const validation = await this.validateReferralCode(referralCode);
    
    if (!validation.valid) {
      console.log('[REFERRAL] Invalid referral code:', validation.error);
      return null;
    }

    const { referralCode: code } = validation;
    
    if (code.user_id === referredId) {
      console.log('[REFERRAL] Cannot refer yourself');
      return null;
    }

    const referral = await this.createReferral(code.user_id, referredId, code.id);
    
    if (referral) {
      console.log('[REFERRAL] Referral created:', referral.id);
    }
    
    return referral;
  }

  async completeReferral(referredId) {
    const settings = await this.getSettings();
    const minProjects = parseInt(settings.min_projects_for_completion) || 1;

    const referralResult = await pool.query(
      `SELECT * FROM referrals 
       WHERE referred_id = $1 AND status IN ('registered', 'pending', 'verified')`,
      [referredId]
    );

    if (referralResult.rows.length === 0) {
      return null;
    }

    const referral = referralResult.rows[0];
    const completedProjects = await this.getCompletedProjectsCount(referredId);

    if (completedProjects >= minProjects) {
      const newStatus = 'completed';
      const completedDate = new Date();
      
      await pool.query(
        `UPDATE referrals SET 
          status = $1,
          completed_date = $2,
          verification_date = NOW()
         WHERE id = $3`,
        [newStatus, completedDate, referral.id]
      );

      await this.applyReferralBonuses(referral.referrer_id, referral.referred_id);

      return { referral, completedProjects };
    } else {
      await pool.query(
        `UPDATE referrals SET status = 'verified', verification_date = NOW() WHERE id = $1`,
        [referral.id]
      );

      return { referral, completedProjects, message: `Need ${minProjects - completedProjects} more project(s) to complete referral` };
    }
  }

  async getCompletedProjectsCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM projects 
       WHERE (expert_id = $1 OR company_id = $1 OR client_id = $1) 
       AND status = 'completed'`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async applyReferralBonuses(referrerId, referredId) {
    const settings = await this.getSettings();
    const referrerBonus = parseFloat(settings.referrer_trust_bonus) || 10;
    const referredBonus = parseFloat(settings.referred_trust_bonus) || 15;

    await pool.query(
      `UPDATE referrals SET 
        status = 'completed',
        referrer_trust_bonus = $1,
        referred_trust_bonus = $2,
        completed_date = NOW()
       WHERE referrer_id = $3 AND referred_id = $4`,
      [referrerBonus, referredBonus, referrerId, referredId]
    );

    console.log(`[REFERRAL] Bonuses applied: referrer ${referrerBonus}, referred ${referredBonus}`);

    try {
      await trustProfileService.recalculateTrustProfile(referrerId, null, 'referral_completed');
      await trustProfileService.recalculateTrustProfile(referredId, null, 'referral_completed');
      console.log(`[REFERRAL] Trust profiles recalculated for both users`);
    } catch (e) {
      console.error(`[REFERRAL] Error recalculating trust profiles:`, e.message);
    }
  }

  async getSettings() {
    const result = await pool.query('SELECT key, value FROM referral_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  async getUserReferrals(userId) {
    const result = await pool.query(
      `SELECT r.*, u.name as referred_name, u.email as referred_email, u.role as referred_role
       FROM referrals r
       JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = $1
       ORDER BY r.referral_date DESC`,
      [userId]
    );
    return result.rows;
  }

  async getReferralStats(userId) {
    const referrals = await this.getUserReferrals(userId);
    
    const stats = {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'pending').length,
      registered: referrals.filter(r => r.status === 'registered').length,
      verified: referrals.filter(r => r.status === 'verified').length,
      completed: referrals.filter(r => r.status === 'completed').length,
      totalTrustEarned: referrals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + parseFloat(r.referrer_trust_bonus || 0), 0)
    };

    return stats;
  }

  async getMyReferralInfo(userId) {
    const code = await this.getOrCreateReferralCode(userId);
    const stats = await this.getReferralStats(userId);
    const referrals = await this.getUserReferrals(userId);

    return {
      code: code.code,
      usageCount: code.usage_count,
      maxUses: code.max_uses,
      isActive: code.is_active,
      stats,
      recentReferrals: referrals.slice(0, 5)
    };
  }

  async getReferralByReferredId(referredId) {
    const result = await pool.query(
      `SELECT r.*, rc.code as referral_code
       FROM referrals r
       JOIN referral_codes rc ON r.referral_code_id = rc.id
       WHERE r.referred_id = $1`,
      [referredId]
    );
    return result.rows[0] || null;
  }

  async cancelReferral(referralId, cancelledBy) {
    const result = await pool.query(
      `UPDATE referrals SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [referralId]
    );
    return result.rows[0];
  }

  async getAllReferrals(filters = {}) {
    let query = `
      SELECT r.*, 
        ur.name as referrer_name, ur.email as referrer_email,
        ud.name as referred_name, ud.email as referred_email
      FROM referrals r
      JOIN users ur ON r.referrer_id = ur.id
      JOIN users ud ON r.referred_id = ud.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND r.status = $${params.length}`;
    }

    if (filters.referrerId) {
      params.push(filters.referrerId);
      query += ` AND r.referrer_id = $${params.length}`;
    }

    query += ' ORDER BY r.referral_date DESC';

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export default new ReferralService();
