import pool from '../config/database.js';

// ============================================
// CONFIGURABLE POINTS SYSTEM
// ============================================

// REFERRAL (TYPE1) POINTS CONFIG
const REFERRAL_CONFIG = {
  // Points for referrer when referral completes onboarding
  REFERER_BONUS: 5,
  // Points for referrer when their referred user signs master contract
  CONTRACT_REFERER_BONUS: 5,
  // Identity (type2) points awarded to the referred user on approval (referrer gets type1 only)
  REFERRED_BONUS: 20,
  // Minimum requirements for referral bonus to be awarded
  REFERRAL_COMPLETION_REQUIREMENTS: ['profile_completed', 'kyc_verified']
};

// VALIDATION (TYPE2) POINTS CONFIG
const VALIDATION_CONFIG = {
  KYC_VERIFIED_POINTS: 5,
  PROFILE_COMPLETED_POINTS: 15,
  PROFILE_PHOTO_POINTS: 10,
  PORTFOLIO_APPROVED_POINTS: 15,
  PAYMENT_METHOD_POINTS: 10,
  VERIFICATION_CALL_APPROVED_POINTS: 15,
  EMAIL_VALIDATED_POINTS: 10,
  REFERRED_BY_POINTS: 20,
  VALIDATED_PARTNERSHIP_POINTS: 10
};

// REFERRAL LEVEL MAPPING FUNCTION
// New user gets referrer_level - 1 (minimum 1)
const REFERRAL_LEVEL_MAPPING = (referrerLevel) => {
  return Math.max(referrerLevel - 1, 1);
};

// LEVEL THRESHOLDS
const VERIFICATION_LEVEL_THRESHOLDS = {
  0: 0,
  1: 10,
  2: 25,
  3: 40,
  4: 55
};

const TRUST_LEVEL_THRESHOLDS = {
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100
};

const TRUST_WEIGHTS = {
  accepted_master_contract: 15,
  recommended_by_user: 10,
  recommended_by_company: 10,
  has_direct_collaboration: 10,
  is_known_directly_by_admin: 20,
  profile_photo_added: 10,
  verified_identity: 5,
  profile_completed: 15,
  portfolio_completed: 15,
  email_validated: 10,
  validated_partnership: 10
};

class TrustProfileService {
  async getOrCreateTrustProfile(userId) {
    const profileType = await this.determineProfileType(userId);
    
    let result = await pool.query(
      'SELECT * FROM trust_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO trust_profiles (user_id, profile_type, trust_level, trust_score)
         VALUES ($1, $2, 1, 20)
         RETURNING *`,
        [userId, profileType]
      );
    }

    return result.rows[0];
  }

  async determineProfileType(userId) {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const userRole = result.rows[0].role;
    if (userRole === 'company') {
      return 'company';
    }
    return 'expert';
  }

  async calculateTrustScore(userId) {
    const profile = await this.getOrCreateTrustProfile(userId);
    const userData = await this.getUserVerificationData(userId);
    
    const trustData = {
      verified_identity: userData.kyc_status === 'verified',
      profile_completed: this.isProfileCompleted(userData),
      profile_photo_added: profile.profile_photo_added === true,
      portfolio_completed: profile.portfolio_approved_by_admin === true,
      email_validated: profile.email_validated === true,
      accepted_master_contract: await this.hasAcceptedMasterContract(userId),
      recommended_by_user: profile.referred_by !== null,
      recommended_by_company: profile.recommended_by_company_id !== null,
      has_direct_collaboration: profile.has_direct_collaboration,
      is_known_directly_by_admin: profile.is_known_directly_by_admin
    };
    
    let trustScore = 0;
    for (const [key, value] of Object.entries(trustData)) {
      if (value === true) {
        trustScore += TRUST_WEIGHTS[key] || 0;
      }
    }

    // If recommended by admin AND has verification call = Level 5 with 100 score
    if (profile.is_known_directly_by_admin && profile.has_verification_call) {
      trustScore = 100;
    } else {
      const collaborationMultiplier = 1 + (profile.collaboration_count * 0.05);
      trustScore = Math.min(trustScore * collaborationMultiplier, 100);

      const ratingBonus = profile.average_rating > 0 
        ? (profile.average_rating - 3) * 5 
        : 0;
      trustScore = Math.min(trustScore + ratingBonus, 100);
    }

    return {
      trustScore: Math.round(trustScore * 100) / 100,
      trustLevel: this.calculateTrustLevel(trustScore),
      trustData
    };
  }

  calculateTrustLevel(score) {
    return Math.min(Math.floor(score / 20), 5);
  }

  calculateVerificationLevel(score) {
    if (score >= VERIFICATION_LEVEL_THRESHOLDS[4]) return 4;
    if (score >= VERIFICATION_LEVEL_THRESHOLDS[3]) return 3;
    if (score >= VERIFICATION_LEVEL_THRESHOLDS[2]) return 2;
    if (score >= VERIFICATION_LEVEL_THRESHOLDS[1]) return 1;
    return 0;
  }

  isProfileCompleted(userData) {
    const basicFields = ['name', 'email'];
    const hasBasicFields = basicFields.every(field => userData[field] && userData[field].trim() !== '');
    
    const hasContactInfo = !!(userData.phone && userData.phone.trim() !== '');
    const hasBio = !!(userData.bio && userData.bio.trim() !== '');
    
    if (userData.role === 'expert') {
      const hasExpertFields = !!(
        userData.expertise && userData.expertise.trim() !== '' &&
        userData.industry && userData.industry.trim() !== '' &&
        userData.experience && userData.experience.trim() !== ''
      );
      return hasBasicFields && hasContactInfo && hasBio && hasExpertFields;
    }
    
    if (userData.role === 'company') {
      const hasCompanyFields = !!(
        userData.company && userData.company.trim() !== '' &&
        userData.industry && userData.industry.trim() !== '' &&
        userData.expertise && userData.expertise.trim() !== '' &&
        userData.experience && userData.experience.trim() !== ''
      );
      return hasBasicFields && hasContactInfo && hasBio && hasCompanyFields;
    }
    
    return hasBasicFields && hasContactInfo && hasBio;
  }

  async isPortfolioCompleted(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM portfolio_items WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count) >= 3;
  }

  async hasAcceptedMasterContract(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM master_contracts WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  async getUserVerificationData(userId) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async recalculateTrustProfile(userId, changedBy = null, reason = 'manual_recalculation') {
    const profile = await this.getOrCreateTrustProfile(userId);
    
    const userData = await this.getUserVerificationData(userId);
    
    const stats = await this.getUserStats(userId);
    
    const newTrustData = {
      has_verification_call: profile.has_verification_call,
      // Use both old and new Type2 fields (new ones take precedence)
      verified_identity: profile.kyc_verified || userData.kyc_status === 'verified',
      profile_completed: profile.profile_completed || this.isProfileCompleted(userData),
      profile_photo_added: profile.profile_photo_added === true,
      portfolio_completed: profile.portfolio_approved_by_admin === true,
      email_validated: profile.email_validated === true,
      accepted_master_contract: await this.hasAcceptedMasterContract(userId),
      recommended_by_user_id: profile.referred_by,
      recommended_by_company_id: profile.recommended_by_company_id,
      has_direct_collaboration: profile.has_direct_collaboration,
      is_known_directly_by_admin: profile.is_known_directly_by_admin,
      collaboration_count: stats.collaborationCount,
      total_projects_completed: stats.completedProjects,
      average_rating: stats.averageRating,
      total_reviews_count: stats.reviewsCount
    };

    // type2_points is the sole authoritative accumulator — managed exclusively by awardType2Points.
    // Non-referred users can only earn type2_points via admin actions; self-validations are blocked at source.
    const verificationScore = profile.type2_points || 0;
    const verificationLevel = this.calculateVerificationLevel(verificationScore);

    // Trust level derived from accumulated trust_score (20/40/60/80/100 per level)
    // Points accumulate beyond level 5 — trust_score is the source of truth
    const trustScore = Math.max(profile.trust_score || 20, 20);
    const trustLevel = this.calculateTrustLevel(trustScore);

    await pool.query(
      `UPDATE trust_profiles SET
        trust_level = $1,
        trust_score = $2,
        verification_level = $3,
        verification_score = $4,
        verified_identity = $5,
        profile_completed = $6,
        portfolio_completed = $7,
        accepted_master_contract = $8,
        collaboration_count = $9,
        total_projects_completed = $10,
        average_rating = $11,
        total_reviews_count = $12,
        type2_points = $13,
        calculated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $14`,
       [
         trustLevel,
         trustScore,
        verificationLevel,
        profile.type2_points || verificationScore,
        newTrustData.verified_identity,
        newTrustData.profile_completed,
        newTrustData.portfolio_completed,
        newTrustData.accepted_master_contract,
        newTrustData.collaboration_count,
        newTrustData.total_projects_completed,
        newTrustData.average_rating,
        newTrustData.total_reviews_count,
        profile.type2_points || verificationScore,
        userId
      ]
    );

    await pool.query(
      `INSERT INTO trust_profile_history 
        (trust_profile_id, trust_level, trust_score, change_reason, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [profile.id, trustLevel, Math.round(trustScore * 100) / 100, reason, changedBy]
    );

    return {
      trust_level: trustLevel,
      trust_score: Math.round(trustScore * 100) / 100,
      ...newTrustData
    };
  }

  async getUserStats(userId) {
    const completedProjectsResult = await pool.query(
      `SELECT COUNT(*) as count FROM projects 
       WHERE (expert_id = $1 OR company_id = $1) AND status = 'completed'`,
      [userId]
    );

    const collaborationResult = await pool.query(
      `SELECT COUNT(*) as count FROM direct_collaborations WHERE user_id = $1`,
      [userId]
    );

    const ratingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count 
       FROM reviews WHERE reviewed_id = $1`,
      [userId]
    );

    return {
      completedProjects: parseInt(completedProjectsResult.rows[0].count),
      collaborationCount: parseInt(collaborationResult.rows[0].count),
      averageRating: parseFloat(ratingResult.rows[0].avg_rating) || 0,
      reviewsCount: parseInt(ratingResult.rows[0].count)
    };
  }

  async getTrustProfileById(userId) {
    const profileResult = await pool.query(
      `SELECT tp.*, u.name, u.email, u.role, u.kyc_status, u.verification_date
       FROM trust_profiles tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.user_id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return null;
    }

    return profileResult.rows[0];
  }

  async setRecommendation(userId, recommenderId, recommenderType) {
    const profile = await this.getOrCreateTrustProfile(userId);
    const points = recommenderType === 'company' ? TRUST_WEIGHTS.recommended_by_company : TRUST_WEIGHTS.recommended_by_user;
    
    if (recommenderType === 'company') {
      await pool.query(
        'UPDATE trust_profiles SET recommended_by_company_id = $1, type1_points = type1_points + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
        [recommenderId, points, userId]
      );
    } else {
      await pool.query(
        'UPDATE trust_profiles SET recommended_by_user_id = $1, type1_points = type1_points + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
        [recommenderId, points, userId]
      );
    }

    await this.recalculateTrustProfile(userId, recommenderId, 'recommendation_added');
  }

  async setDirectCollaboration(userId, collaboratorId, projectId = null) {
    const profileType = await this.determineProfileType(userId);
    const collaboratorType = await this.determineProfileType(collaboratorId);
    
    let collaborationType;
    if (profileType === 'expert' && collaboratorType === 'expert') {
      collaborationType = 'expert_expert';
    } else if (profileType === 'company' && collaboratorType === 'company') {
      collaborationType = 'company_company';
    } else {
      collaborationType = 'expert_company';
    }

    await pool.query(
      `INSERT INTO direct_collaborations (user_id, collaborator_id, project_id, collaboration_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, collaborator_id, project_id) DO NOTHING`,
      [userId, collaboratorId, projectId, collaborationType]
    );

    await pool.query(
      `UPDATE trust_profiles SET has_direct_collaboration = TRUE, type1_points = type1_points + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2 OR user_id = $3`,
      [TRUST_WEIGHTS.has_direct_collaboration, userId, collaboratorId]
    );

    await this.recalculateTrustProfile(userId, null, 'direct_collaboration_added');
    await this.recalculateTrustProfile(collaboratorId, null, 'direct_collaboration_added');
  }

  async setKnownByAdmin(userId, adminId) {
    await pool.query(
      'UPDATE trust_profiles SET is_known_directly_by_admin = TRUE, trust_level = 4, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    await this.recalculateTrustProfile(userId, adminId, 'admin_verification');
  }

  async acceptMasterContract(userId, ipAddress = null, userAgent = null) {
    await pool.query(
      `INSERT INTO master_contracts (user_id, ip_address, user_agent)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         accepted_at = CURRENT_TIMESTAMP,
         ip_address = EXCLUDED.ip_address,
         user_agent = EXCLUDED.user_agent`,
      [userId, ipAddress, userAgent]
    );

    // Award 10 type1 points to the user who signs the contract
    await pool.query(
      `UPDATE trust_profiles SET accepted_master_contract = TRUE, type1_points = type1_points + 10, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId]
    );

    // If user was referred, award 5 bonus points to the referrer
    const referredResult = await pool.query(
      'SELECT referred_by FROM trust_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (referredResult.rows[0]?.referred_by) {
      await pool.query(
        `UPDATE trust_profiles SET type1_points = type1_points + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [REFERRAL_CONFIG.CONTRACT_REFERER_BONUS, referredResult.rows[0].referred_by]
      );
      console.log(`[CONTRACT] Awarded ${REFERRAL_CONFIG.CONTRACT_REFERER_BONUS} bonus points to referrer ${referredResult.rows[0].referred_by}`);
    }

    await this.recalculateTrustProfile(userId, null, 'master_contract_signed');
  }

  async getAllTrustProfiles(filters = {}) {
    let query = `
      SELECT tp.*,
             u.name AS user_name,
             u.email AS user_email,
             u.company AS user_company,
             u.role AS user_role,
             u.kyc_status
      FROM trust_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.profileType) {
      params.push(filters.profileType);
      query += ` AND tp.profile_type = $${params.length}`;
    }

    if (filters.trustLevel) {
      params.push(filters.trustLevel);
      query += ` AND tp.trust_level = $${params.length}`;
    }

    if (filters.minTrustScore) {
      params.push(filters.minTrustScore);
      query += ` AND tp.trust_score >= $${params.length}`;
    }

    query += ' ORDER BY tp.trust_score DESC, tp.trust_level DESC';

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getTrustHistory(userId, limit = 10) {
    const profile = await this.getOrCreateTrustProfile(userId);
    
    const result = await pool.query(
      `SELECT tph.*, u.name as changed_by_name
       FROM trust_profile_history tph
       LEFT JOIN users u ON tph.changed_by = u.id
       WHERE tph.trust_profile_id = $1
       ORDER BY tph.created_at DESC
       LIMIT $2`,
      [profile.id, limit]
    );

    return result.rows;
  }

  async addReferralBonus(userId, type = 'referred') {
    const referredBonus = 15;
    const referrerBonus = 10;
    
    if (type === 'referred') {
      await pool.query(
        `UPDATE trust_profiles SET 
          trust_score = trust_score + $1,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [referredBonus, userId]
      );
      
      const result = await pool.query('SELECT trust_score FROM trust_profiles WHERE user_id = $1', [userId]);
      const newScore = parseFloat(result.rows[0].trust_score);
      const newLevel = this.calculateTrustLevel(newScore);
      
      await pool.query(
        `UPDATE trust_profiles SET trust_level = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [newLevel, userId]
      );
      
      console.log(`[TRUST] Added ${referredBonus} bonus points to user ${userId}. New score: ${newScore}, New level: ${newLevel}`);
    }
  }

  // ============================================
  // REFERRAL SYSTEM (TYPE1 POINTS)
  // ============================================

  async applyReferralOnSignup(newUserId, referrerId) {
    try {
      // Get referrer's trust profile
      const referrerProfile = await this.getOrCreateTrustProfile(referrerId);
      
      // Get new user's profile
      const newUserProfile = await this.getOrCreateTrustProfile(newUserId);
      
      // Check for self-referral
      if (newUserId === referrerId) {
        console.log('[REFERRAL] Self-referral detected, ignoring');
        return { success: false, reason: 'self_referral' };
      }
      
      // Check if referrer has active account
      const referrerUser = await pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [referrerId]
      );
      
      if (referrerUser.rows.length === 0) {
        console.log('[REFERRAL] Referrer not found');
        return { success: false, reason: 'referrer_not_found' };
      }
      
      // Check if referred_by is already set (cannot be changed)
      if (newUserProfile.referred_by) {
        console.log('[REFERRAL] User already has a referrer, cannot change');
        return { success: false, reason: 'already_has_referrer' };
      }
      
      // Get referrer's trust level
      const referrerLevel = referrerProfile.trust_level || 1;
      
      // Apply FIXED LEVEL MAPPING
      const newUserLevel = REFERRAL_LEVEL_MAPPING(referrerLevel);
      const newUserScore = newUserLevel * 20;
      
      // Update new user's profile: set trust level from referrer + 20 identity points (known by someone)
      await pool.query(
        `UPDATE trust_profiles SET
          referred_by = $1,
          trust_level = $2,
          trust_score = $4,
          type2_points = type2_points + 20,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [referrerId, newUserLevel, newUserId, newUserScore]
      );
      
      // Award points to referrer
      await pool.query(
        `UPDATE trust_profiles SET 
          type1_points = type1_points + $1,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [REFERRAL_CONFIG.REFERER_BONUS, referrerId]
      );
      
      console.log(`[REFERRAL] Applied: Referrer=${referrerId}, NewUser=${newUserId}, ReferrerLevel=${referrerLevel}, NewUserLevel=${newUserLevel}`);
      
      return { 
        success: true, 
        referrer_level: referrerLevel,
        new_user_level: newUserLevel,
        referrer_bonus: REFERRAL_CONFIG.REFERER_BONUS,
        referred_bonus: REFERRAL_CONFIG.REFERRED_BONUS
      };
      
    } catch (error) {
      console.error('[REFERRAL] Error applying referral:', error.message);
      return { success: false, reason: error.message };
    }
  }

  // Apply referral benefits when verification call is completed
  async applyReferralOnApproval(userId) {
    try {
      const profile = await this.getOrCreateTrustProfile(userId);

      // If user has no referrer, skip
      if (!profile.referred_by) {
        console.log('[REFERRAL] No referrer for user:', userId);
        return { success: false, reason: 'no_referrer' };
      }
      
      // Get referrer's referral code to check if it's a VIP code
      const referrerCodeResult = await pool.query(
        `SELECT rc.trust_level_bonus, rc.user_id as referrer_id 
         FROM referral_codes rc 
         WHERE rc.user_id = $1`,
        [profile.referred_by]
      );
      
      let newUserLevel;
      let referrerId = profile.referred_by;
      
      if (referrerCodeResult.rows.length > 0 && referrerCodeResult.rows[0].trust_level_bonus) {
        // VIP code - use the specified level directly
        newUserLevel = parseInt(referrerCodeResult.rows[0].trust_level_bonus);
        console.log('[REFERRAL] VIP code detected, level:', newUserLevel);
      } else {
        // Regular referral - calculate based on referrer's level
        const referrerProfile = await this.getOrCreateTrustProfile(profile.referred_by);
        const referrerLevel = referrerProfile.trust_level || 1;
        
        newUserLevel = REFERRAL_LEVEL_MAPPING(referrerLevel);
        console.log('[REFERRAL] Regular referral, referrer level:', referrerLevel, '-> new user level:', newUserLevel);
      }
      
      // Only upgrade level. Type1 bonus (referrer) and type2 bonus (referred) already applied at signup
      // via applyReferralOnSignup — verification approval just confirms the level.
      await pool.query(
        `UPDATE trust_profiles SET
          trust_level = GREATEST(trust_level, $1),
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [newUserLevel, userId]
      );
      
      console.log(`[REFERRAL] Benefits applied on approval: User=${userId}, Level=${newUserLevel}, Referrer=${referrerId}`);
      
      return { 
        success: true, 
        new_user_level: newUserLevel,
        referrer_id: referrerId
      };
      
    } catch (error) {
      console.error('[REFERRAL] Error applying referral on approval:', error.message);
      return { success: false, reason: error.message };
    }
  }

  async checkAndAwardReferralBonus(userId) {
    try {
      const profile = await this.getOrCreateTrustProfile(userId);
      
      if (!profile.referred_by) {
        return { success: false, reason: 'no_referrer' };
      }
      
      // Check completion requirements
      const userData = await this.getUserVerificationData(userId);
      const requirements = REFERRAL_CONFIG.REFERRAL_COMPLETION_REQUIREMENTS;
      
      let allMet = true;
      for (const req of requirements) {
        if (req === 'profile_completed' && !this.isProfileCompleted(userData)) {
          allMet = false; break;
        }
        if (req === 'kyc_verified' && userData.kyc_status !== 'verified') {
          allMet = false; break;
        }
      }
      
      if (!allMet) {
        return { success: false, reason: 'requirements_not_met' };
      }
      
      // Award bonus points to referrer
      await pool.query(
        `UPDATE trust_profiles SET 
          type1_points = type1_points + $1,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [REFERRAL_CONFIG.REFERER_BONUS, profile.referred_by]
      );
      
      console.log(`[REFERRAL] Bonus awarded to referrer ${profile.referred_by}`);
      
      return { success: true, bonus_awarded: REFERRAL_CONFIG.REFERER_BONUS };
      
    } catch (error) {
      console.error('[REFERRAL] Error checking referral bonus:', error.message);
      return { success: false, reason: error.message };
    }
  }

  // ============================================
  // VALIDATION SYSTEM (TYPE2 POINTS)
  // ============================================

  async awardType2Points(userId, validationType) {
    try {

      let pointsToAdd = 0;
      let fieldToUpdate = null;

      switch (validationType) {
        case 'kyc_verified':
          pointsToAdd = VALIDATION_CONFIG.KYC_VERIFIED_POINTS;
          fieldToUpdate = 'kyc_verified';
          break;
        case 'profile_photo':
          pointsToAdd = VALIDATION_CONFIG.PROFILE_PHOTO_POINTS;
          fieldToUpdate = 'profile_photo_added';
          break;
        case 'profile_completed':
          pointsToAdd = VALIDATION_CONFIG.PROFILE_COMPLETED_POINTS;
          fieldToUpdate = 'profile_completed';
          break;
        case 'portfolio_approved':
          pointsToAdd = VALIDATION_CONFIG.PORTFOLIO_APPROVED_POINTS;
          fieldToUpdate = 'portfolio_approved_by_admin';
          break;
        case 'payment_method_added':
          pointsToAdd = VALIDATION_CONFIG.PAYMENT_METHOD_POINTS;
          fieldToUpdate = 'payment_method_added';
          break;
        case 'video_call_approved':
          pointsToAdd = VALIDATION_CONFIG.VERIFICATION_CALL_APPROVED_POINTS;
          fieldToUpdate = 'has_verification_call';
          break;
        case 'email_validated':
          pointsToAdd = VALIDATION_CONFIG.EMAIL_VALIDATED_POINTS;
          fieldToUpdate = 'email_validated';
          break;
        case 'project_completed':
          // Project completion awards trust_score (not identity points) — handled by trustProfileHooks
          return { success: false, reason: 'use_awardProjectCompletion_instead' };
        default:
          return { success: false, reason: 'unknown_validation_type' };
      }
      
      // Skip if field already true (except for project_completed which can be awarded multiple times)
      if (fieldToUpdate && fieldToUpdate !== 'project_completed') {
        const checkResult = await pool.query(
          `SELECT ${fieldToUpdate} FROM trust_profiles WHERE user_id = $1`,
          [userId]
        );
        if (checkResult.rows[0]?.[fieldToUpdate] === true) {
          console.log(`[VALIDATION] ${validationType} already awarded for user ${userId}`);
          return { success: false, reason: 'already_awarded' };
        }
      }
      
      // Update field and add points
      if (fieldToUpdate) {
        await pool.query(
          `UPDATE trust_profiles SET 
            ${fieldToUpdate} = TRUE,
            type2_points = type2_points + $1,
            updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [pointsToAdd, userId]
        );
      } else {
        await pool.query(
          `UPDATE trust_profiles SET 
            type2_points = type2_points + $1,
            updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [pointsToAdd, userId]
        );
      }
      
      console.log(`[VALIDATION] Awarded ${pointsToAdd} Type2 points to ${userId} for ${validationType}`);
      
      // Recalculate verification level
      await this.recalculateTrustProfile(userId, null, `type2_${validationType}`);
      
      return { success: true, points_awarded: pointsToAdd, validation_type: validationType };
      
    } catch (error) {
      console.error('[VALIDATION] Error awarding Type2 points:', error.message);
      return { success: false, reason: error.message };
    }
  }

  async isIdentityFullyValidated(userId) {
    const profile = await this.getOrCreateTrustProfile(userId);
    
    return (
      profile.kyc_verified === true &&
      profile.profile_completed === true &&
      profile.portfolio_approved_by_admin === true &&
      profile.payment_method_added === true
    );
  }

  // ============================================
  // MANUAL OVERRIDE SYSTEM
  // ============================================

  async setManualTrustOverride(userId, newLevel, reason, adminId) {
    try {
      if (!reason || reason.trim() === '') {
        return { success: false, reason: 'reason_required' };
      }
      
      if (newLevel < 1 || newLevel > 5) {
        return { success: false, reason: 'invalid_level' };
      }
      
      const newScore = newLevel * 20;
      
      await pool.query(
        `UPDATE trust_profiles SET 
          trust_level = $1,
          trust_score = $2,
          manual_trust_override = TRUE,
          override_reason = $3,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4`,
        [newLevel, newScore, reason, userId]
      );
      
      // Log to history
      const profile = await this.getOrCreateTrustProfile(userId);
      await pool.query(
        `INSERT INTO trust_profile_history 
          (trust_profile_id, trust_level, trust_score, change_reason, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [profile.id, newLevel, newScore, `MANUAL_OVERRIDE: ${reason}`, adminId]
      );
      
      console.log(`[OVERRIDE] Manual override set for ${userId}: Level=${newLevel}, Reason=${reason}`);
      
      return { success: true, new_level: newLevel, reason: reason };
      
    } catch (error) {
      console.error('[OVERRIDE] Error setting manual override:', error.message);
      return { success: false, reason: error.message };
    }
  }

  async removeManualTrustOverride(userId) {
    try {
      await pool.query(
        `UPDATE trust_profiles SET 
          manual_trust_override = FALSE,
          override_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );
      
      // Recalculate based on normal rules
      await this.recalculateTrustProfile(userId, null, 'override_removed');
      
      return { success: true };
      
    } catch (error) {
      console.error('[OVERRIDE] Error removing manual override:', error.message);
      return { success: false, reason: error.message };
    }
  }
}

export default new TrustProfileService();
