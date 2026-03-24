import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import trustProfileService from '../services/trustProfileService.js';
import trustProfileInit from '../services/trustProfileInit.js';
import pool from '../config/database.js';

const router = express.Router();

router.get('/all', async (req, res) => {
  try {
    const { profileType, trustLevel, limit } = req.query;

    const filters = {
      profileType,
      trustLevel: trustLevel ? parseInt(trustLevel) : null,
      limit: limit ? parseInt(limit) : 100
    };

    const profiles = await trustProfileService.getAllTrustProfiles(filters);

    const publicProfiles = profiles.map(p => ({
      user_id: p.user_id,
      name: p.name,
      profile_type: p.profile_type,
      trust_level: p.trust_level,
      trust_score: p.trust_score,
      verified_identity: p.verified_identity,
      profile_completed: p.profile_completed,
      portfolio_completed: p.portfolio_completed,
      accepted_master_contract: p.accepted_master_contract,
      total_projects_completed: p.total_projects_completed,
      average_rating: p.average_rating,
      is_known_directly_by_admin: p.is_known_directly_by_admin,
      type1_points: p.type1_points || 0,
      type2_points: p.type2_points || 0,
      type3_points: p.type3_points || 0
    }));

    res.json({ profiles: publicProfiles, count: publicProfiles.length });
  } catch (err) {
    console.error('Error fetching all trust profiles:', err);
    res.status(500).json({ error: 'Failed to fetch trust profiles', details: err.message });
  }
});

router.get('/my-trust-profile', protect, async (req, res) => {
  try {
    console.log('[DEBUG /my-trust-profile] req.user.id:', req.user.id);
    const profile = await trustProfileService.getTrustProfileById(req.user.id);
    
    if (!profile) {
      return res.status(404).json({ message: 'Trust profile not found' });
    }

    // Only recalculate if trust level is 1 (not set by referral/VIP)
    let recalculatedData = {};
    if (profile.trust_level <= 1) {
      recalculatedData = await trustProfileService.recalculateTrustProfile(req.user.id);
    } else {
      console.log(`[DEBUG] Skipping recalculation for user ${req.user.id} with trust_level ${profile.trust_level}`);
    }

    res.json({
      ...profile,
      ...recalculatedData
    });
  } catch (err) {
    console.error('Error fetching trust profile:', err);
    res.status(500).json({ error: 'Failed to fetch trust profile', details: err.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await trustProfileService.getTrustProfileById(userId);

    if (!profile) {
      return res.status(404).json({ message: 'Trust profile not found' });
    }

    const publicProfile = {
      user_id: profile.user_id,
      name: profile.name,
      profile_type: profile.profile_type,
      trust_level: profile.trust_level,
      trust_score: profile.trust_score,
      verified_identity: profile.verified_identity,
      profile_completed: profile.profile_completed,
      portfolio_completed: profile.portfolio_completed,
      accepted_master_contract: profile.accepted_master_contract,
      total_projects_completed: profile.total_projects_completed,
      average_rating: profile.average_rating,
      total_reviews_count: profile.total_reviews_count,
      is_known_directly_by_admin: profile.is_known_directly_by_admin,
      has_direct_collaboration: profile.has_direct_collaboration,
      type1_points: profile.type1_points || 0,
      type2_points: profile.type2_points || 0,
      type3_points: profile.type3_points || 0
    };

    res.json(publicProfile);
  } catch (err) {
    console.error('Error fetching trust profile:', err);
    res.status(500).json({ error: 'Failed to fetch trust profile', details: err.message });
  }
});

router.post('/recalculate/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const result = await trustProfileService.recalculateTrustProfile(
      userId,
      req.user.id,
      reason || 'admin_manual_recalculation'
    );

    res.json({
      message: 'Trust profile recalculated successfully',
      trust_profile: result
    });
  } catch (err) {
    console.error('Error recalculating trust profile:', err);
    res.status(500).json({ error: 'Failed to recalculate trust profile', details: err.message });
  }
});

router.put('/admin/update-level/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { trust_level } = req.body;

    if (!trust_level || trust_level < 1 || trust_level > 5) {
      return res.status(400).json({ error: 'Trust level must be between 1 and 5' });
    }

    await pool.query(
      'UPDATE trust_profiles SET trust_level = $1, trust_score = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
      [trust_level, trust_level * 20, userId]
    );

    res.json({ message: 'Trust level updated successfully', trust_level });
  } catch (err) {
    console.error('Error updating trust level:', err);
    res.status(500).json({ error: 'Failed to update trust level', details: err.message });
  }
});

router.post('/recommend/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const recommenderType = req.user.role === 'company' ? 'company' : 'user';

    await trustProfileService.setRecommendation(userId, req.user.id, recommenderType);

    res.json({ message: 'Recommendation added successfully' });
  } catch (err) {
    console.error('Error adding recommendation:', err);
    res.status(500).json({ error: 'Failed to add recommendation', details: err.message });
  }
});

router.post('/collaboration/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { projectId } = req.body;

    await trustProfileService.setDirectCollaboration(userId, req.user.id, projectId);

    res.json({ message: 'Direct collaboration recorded successfully' });
  } catch (err) {
    console.error('Error recording collaboration:', err);
    res.status(500).json({ error: 'Failed to record collaboration', details: err.message });
  }
});

router.post('/admin-verify/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;

    await trustProfileService.setKnownByAdmin(userId, req.user.id);

    res.json({ message: 'User marked as known by admin' });
  } catch (err) {
    console.error('Error marking as known by admin:', err);
    res.status(500).json({ error: 'Failed to mark as known by admin', details: err.message });
  }
});

router.post('/accept-master-contract', protect, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    await trustProfileService.acceptMasterContract(req.user.id, ipAddress, userAgent);

    res.json({ message: 'Master contract accepted successfully' });
  } catch (err) {
    console.error('Error accepting master contract:', err);
    res.status(500).json({ error: 'Failed to accept master contract', details: err.message });
  }
});

router.get('/history/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const history = await trustProfileService.getTrustHistory(userId, parseInt(limit) || 10);

    res.json({ history });
  } catch (err) {
    console.error('Error fetching trust history:', err);
    res.status(500).json({ error: 'Failed to fetch trust history', details: err.message });
  }
});

router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { profileType, trustLevel, minTrustScore, limit } = req.query;

    const filters = {
      profileType,
      trustLevel: trustLevel ? parseInt(trustLevel) : null,
      minTrustScore: minTrustScore ? parseFloat(minTrustScore) : null,
      limit: limit ? parseInt(limit) : null
    };

    const profiles = await trustProfileService.getAllTrustProfiles(filters);

    res.json({ profiles, count: profiles.length });
  } catch (err) {
    console.error('Error fetching all trust profiles:', err);
    res.status(500).json({ error: 'Failed to fetch trust profiles', details: err.message });
  }
});

router.post('/admin/initialize', protect, adminOnly, async (req, res) => {
  try {
    const result = await trustProfileInit.initializeAllTrustProfiles();
    res.json({
      message: 'Trust profiles initialized successfully',
      ...result
    });
  } catch (err) {
    console.error('Error initializing trust profiles:', err);
    res.status(500).json({ error: 'Failed to initialize trust profiles', details: err.message });
  }
});

// ============================================
// MANUAL OVERRIDE ROUTES
// ============================================

router.post('/admin/override/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { trust_level, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for manual override' });
    }

    const result = await trustProfileService.setManualTrustOverride(
      userId,
      trust_level,
      reason,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    res.json({
      message: 'Manual trust override applied successfully',
      new_level: result.new_level,
      reason: result.reason
    });
  } catch (err) {
    console.error('Error setting manual override:', err);
    res.status(500).json({ error: 'Failed to set manual override', details: err.message });
  }
});

router.delete('/admin/override/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await trustProfileService.removeManualTrustOverride(userId);

    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    res.json({ message: 'Manual trust override removed successfully' });
  } catch (err) {
    console.error('Error removing manual override:', err);
    res.status(500).json({ error: 'Failed to remove manual override', details: err.message });
  }
});

// ============================================
// TYPE2 VALIDATION ROUTES (Admin only)
// ============================================

router.post('/admin/award-type2/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { validation_type } = req.body;

    const validTypes = ['kyc_verified', 'profile_completed', 'portfolio_approved', 'payment_method_added'];
    if (!validTypes.includes(validation_type)) {
      return res.status(400).json({ 
        error: 'Invalid validation type', 
        valid_types: validTypes 
      });
    }

    const result = await trustProfileService.awardType2Points(userId, validation_type);

    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    res.json({
      message: 'Type2 validation points awarded successfully',
      points_awarded: result.points_awarded,
      validation_type: result.validation_type
    });
  } catch (err) {
    console.error('Error awarding Type2 points:', err);
    res.status(500).json({ error: 'Failed to award Type2 points', details: err.message });
  }
});

router.get('/validation-status/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await trustProfileService.getOrCreateTrustProfile(userId);
    const isFullyValidated = await trustProfileService.isIdentityFullyValidated(userId);

    res.json({
      user_id: userId,
      kyc_verified: profile.kyc_verified,
      profile_completed: profile.profile_completed,
      portfolio_submitted: profile.portfolio_submitted,
      portfolio_approved_by_admin: profile.portfolio_approved_by_admin,
      payment_method_added: profile.payment_method_added,
      type2_points: profile.type2_points,
      is_fully_validated: isFullyValidated
    });
  } catch (err) {
    console.error('Error fetching validation status:', err);
    res.status(500).json({ error: 'Failed to fetch validation status', details: err.message });
  }
});

export default router;
