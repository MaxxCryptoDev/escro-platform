import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import referralService from '../services/referralService.js';
import pool from '../config/database.js';

const router = express.Router();

router.get('/my-referral-info', protect, async (req, res) => {
  try {
    const info = await referralService.getMyReferralInfo(req.user.id);
    res.json(info);
  } catch (err) {
    console.error('Error fetching referral info:', err);
    res.status(500).json({ error: 'Failed to fetch referral info', details: err.message });
  }
});

router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const referralCode = await referralService.getReferralCodeByCode(code);

    if (!referralCode) {
      return res.status(404).json({ message: 'Referral code not found' });
    }

    res.json({
      valid: true,
      code: referralCode.code,
      usageCount: referralCode.usage_count,
      maxUses: referralCode.max_uses
    });
  } catch (err) {
    console.error('Error validating referral code:', err);
    res.status(500).json({ error: 'Failed to validate referral code', details: err.message });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, error: 'Referral code is required' });
    }

    const result = await referralService.validateReferralCode(code);
    res.json(result);
  } catch (err) {
    console.error('Error validating referral code:', err);
    res.status(500).json({ error: 'Failed to validate referral code', details: err.message });
  }
});

router.get('/my-referrals', protect, async (req, res) => {
  try {
    const referrals = await referralService.getUserReferrals(req.user.id);
    res.json({ referrals });
  } catch (err) {
    console.error('Error fetching referrals:', err);
    res.status(500).json({ error: 'Failed to fetch referrals', details: err.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await referralService.getReferralStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching referral stats:', err);
    res.status(500).json({ error: 'Failed to fetch referral stats', details: err.message });
  }
});

router.get('/check-status', protect, async (req, res) => {
  try {
    const referral = await referralService.getReferralByReferredId(req.user.id);
    
    if (!referral) {
      return res.json({ hasReferral: false });
    }

    res.json({
      hasReferral: true,
      referredBy: referral.referrer_id,
      referralCode: referral.referral_code,
      status: referral.status,
      referrerTrustBonus: referral.referrer_trust_bonus,
      referredTrustBonus: referral.referred_trust_bonus,
      referralDate: referral.referral_date,
      completedDate: referral.completed_date
    });
  } catch (err) {
    console.error('Error checking referral status:', err);
    res.status(500).json({ error: 'Failed to check referral status', details: err.message });
  }
});

router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { status, limit } = req.query;

    const filters = {
      status,
      limit: limit ? parseInt(limit) : 50
    };

    const referrals = await referralService.getAllReferrals(filters);
    res.json({ referrals, count: referrals.length });
  } catch (err) {
    console.error('Error fetching all referrals:', err);
    res.status(500).json({ error: 'Failed to fetch referrals', details: err.message });
  }
});

router.get('/admin/stats', protect, adminOnly, async (req, res) => {
  try {
    const allReferrals = await referralService.getAllReferrals({});
    
    const stats = {
      total: allReferrals.length,
      pending: allReferrals.filter(r => r.status === 'pending').length,
      registered: allReferrals.filter(r => r.status === 'registered').length,
      verified: allReferrals.filter(r => r.status === 'verified').length,
      completed: allReferrals.filter(r => r.status === 'completed').length,
      cancelled: allReferrals.filter(r => r.status === 'cancelled').length,
      totalTrustBonuses: allReferrals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + parseFloat(r.referrer_trust_bonus || 0) + parseFloat(r.referred_trust_bonus || 0), 0)
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching referral stats:', err);
    res.status(500).json({ error: 'Failed to fetch referral stats', details: err.message });
  }
});

router.get('/admin/all-codes', protect, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM referral_codes WHERE user_id = $1 ORDER BY trust_level_bonus DESC',
      [req.user.id]
    );
    res.json({ codes: result.rows });
  } catch (err) {
    console.error('Error fetching referral codes:', err);
    res.status(500).json({ error: 'Failed to fetch referral codes', details: err.message });
  }
});

router.post('/admin/generate-vip-code', protect, adminOnly, async (req, res) => {
  try {
    const { trust_level } = req.body;
    
    if (!trust_level || trust_level < 1 || trust_level > 5) {
      return res.status(400).json({ error: 'Trust level must be between 1 and 5' });
    }
    
    const levelPrefix = { 1: 'LV1', 2: 'LV2', 3: 'LV3', 4: 'LV4', 5: 'VIP' };
    const prefix = levelPrefix[trust_level];
    
    // Generate unique code for this level
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      code = prefix;
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if exists
      const existing = await pool.query('SELECT id FROM referral_codes WHERE code = $1', [code]);
      if (existing.rows.length === 0) break;
      attempts++;
    }
    
    // Create new referral code with trust level bonus
    const adminId = req.user.id;
    
    await pool.query(
      'INSERT INTO referral_codes (user_id, code, is_active, max_uses, trust_level_bonus) VALUES ($1, $2, true, 1000, $3)',
      [adminId, code, trust_level]
    );
    
    res.json({ 
      success: true, 
      code, 
      trust_level,
      message: `Cod generat pentru Nivel ${trust_level}: ${code}`
    });
  } catch (err) {
    console.error('Error generating VIP code:', err);
    res.status(500).json({ error: 'Failed to generate VIP code', details: err.message });
  }
});

export default router;
