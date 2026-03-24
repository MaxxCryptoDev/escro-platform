import trustProfileService from './trustProfileService.js';
import pool from '../config/database.js';

export const TrustEventTypes = {
  KYC_VERIFIED: 'kyc_verified',
  KYC_REJECTED: 'kyc_rejected',
  PROFILE_UPDATED: 'profile_updated',
  PORTFOLIO_UPDATED: 'portfolio_updated',
  EMAIL_VALIDATED: 'email_validated',
  PROJECT_COMPLETED: 'project_completed',
  REVIEW_RECEIVED: 'review_received',
  COLLABORATION_STARTED: 'collaboration_started',
  ADMIN_VERIFIED: 'admin_verified',
  RECOMMENDATION_ADDED: 'recommendation_added'
};

class TrustProfileHooks {
  async triggerKYCVerification(userId, status) {
    if (status === 'verified') {
      await trustProfileService.recalculateTrustProfile(
        userId, 
        null, 
        TrustEventTypes.KYC_VERIFIED
      );
    } else if (status === 'rejected') {
      await trustProfileService.recalculateTrustProfile(
        userId, 
        null, 
        TrustEventTypes.KYC_REJECTED
      );
    }
  }

  async triggerProfileUpdate(userId) {
    await trustProfileService.recalculateTrustProfile(
      userId,
      null,
      TrustEventTypes.PROFILE_UPDATED
    );
  }

  async triggerPortfolioUpdate(userId) {
    const checkResult = await pool.query(
      'SELECT COUNT(*) as count FROM portfolio_items WHERE user_id = $1',
      [userId]
    );
    
    const portfolioCount = parseInt(checkResult.rows[0].count);
    
    if (portfolioCount >= 3) {
      try {
        const existingCheck = await pool.query(
          'SELECT portfolio_approved_by_admin FROM trust_profiles WHERE user_id = $1',
          [userId]
        );
        if (!existingCheck.rows[0]?.portfolio_approved_by_admin) {
          await trustProfileService.awardType2Points(userId, 'portfolio_approved');
        }
      } catch (e) {
        console.log('Could not award portfolio points:', e.message);
      }
    }
    
    await trustProfileService.recalculateTrustProfile(
      userId,
      null,
      TrustEventTypes.PORTFOLIO_UPDATED
    );
  }

  async triggerMasterContractAccepted(userId, ipAddress = null, userAgent = null) {
    await trustProfileService.acceptMasterContract(userId, ipAddress, userAgent);
  }

  async triggerProjectCompletion(userId) {
    try {
      // Award 10 type1 points to the user who completes a project
      await pool.query(
        `UPDATE trust_profiles SET type1_points = type1_points + 10, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [userId]
      );
      
      console.log(`[PROJECT] Awarded 10 type1 points for project completion to user ${userId}`);
      
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, 'points_earned', 'Puncte de recompensă acordate!', `Ai finalizat un proiect și ai primit 10 puncte de recompensă.`]
      );
      
    } catch (e) {
      console.log('[PROJECT] Error awarding project completion points:', e.message);
    }
    
    await trustProfileService.recalculateTrustProfile(
      userId,
      null,
      TrustEventTypes.PROJECT_COMPLETED
    );
  }

  async triggerReviewReceived(userId) {
    await trustProfileService.recalculateTrustProfile(
      userId,
      null,
      TrustEventTypes.REVIEW_RECEIVED
    );
  }

  async triggerCollaboration(userId, collaboratorId, projectId = null) {
    await trustProfileService.setDirectCollaboration(userId, collaboratorId, projectId);
  }

  async triggerAdminVerification(userId, adminId) {
    await trustProfileService.setKnownByAdmin(userId, adminId);
  }

  async triggerRecommendation(userId, recommenderId, recommenderType) {
    await trustProfileService.setRecommendation(userId, recommenderId, recommenderType);
  }

  async triggerBatchRecalculation(userIds) {
    const results = [];
    for (const userId of userIds) {
      try {
        const result = await trustProfileService.recalculateTrustProfile(
          userId,
          null,
          'batch_recalculation'
        );
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    return results;
  }
}

export default new TrustProfileHooks();
