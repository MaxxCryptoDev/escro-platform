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
      console.log(`[PROJECT] contract final semnat pentru user ${userId} — punctele au fost acordate la allApproved`);

    } catch (e) {
      console.log('[PROJECT] Error awarding project completion points:', e.message);
    }

    await trustProfileService.recalculateTrustProfile(
      userId,
      null,
      TrustEventTypes.PROJECT_COMPLETED
    );
  }

  // Called at task completion (allApproved). Credits referrer wallet based on their reward points.
  // Formula: min(type1_points, 400) × 0.1% × total_commission_for_task
  // Max payout: 400 pts = 40% of commission.
  // Referrer is skipped if they are a direct participant in the same project (own tasks excluded).
  async triggerReferralMonetaryReward(projectId, expertId, companyId, clientId) {
    try {
      const commissionResult = await pool.query(
        `SELECT COALESCE(SUM(mr.claudiu_commission_amount_ron), 0) as total_commission
         FROM milestone_releases mr
         JOIN escrow_accounts ea ON mr.escrow_id = ea.id
         WHERE ea.project_id = $1`,
        [projectId]
      );
      const totalCommission = parseFloat(commissionResult.rows[0].total_commission);
      if (totalCommission <= 0) return;

      const participantIds = [expertId, companyId, clientId].filter(Boolean);
      const referrerRows = await pool.query(
        `SELECT user_id, referred_by FROM trust_profiles WHERE user_id = ANY($1) AND referred_by IS NOT NULL`,
        [participantIds]
      );

      for (const row of referrerRows.rows) {
        const referrerId = row.referred_by;
        if (participantIds.includes(referrerId)) continue;

        const referrerProfile = await pool.query(
          `SELECT type1_points FROM trust_profiles WHERE user_id = $1`,
          [referrerId]
        );
        // Cap at 400 points → max 40% of commission
        const rawPoints = parseInt(referrerProfile.rows[0]?.type1_points || 0);
        const cappedPoints = Math.min(rawPoints, 400);
        if (cappedPoints <= 0) continue;

        // reward = cappedPoints × 0.1% × totalCommission
        const rewardAmount = Math.round(cappedPoints * 0.001 * totalCommission * 100) / 100;
        if (rewardAmount <= 0) continue;

        await pool.query(
          `UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
          [rewardAmount, referrerId]
        );
        await pool.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, description, project_id)
           VALUES ($1, $2, 'referral_reward', $3, $4)`,
          [referrerId, rewardAmount,
           `Recompensă referral — ${cappedPoints}${rawPoints > 400 ? ' (max 400)' : ''} pct × 0.1% × ${totalCommission} RON comision`,
           projectId]
        );
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, 'wallet_credit', 'Recompensă referral în wallet!', $2, NOW())`,
          [referrerId, `Ai primit ${rewardAmount} RON în wallet pentru recomandarea unui participant la un task finalizat (${cappedPoints} puncte × 0.1% × ${totalCommission} RON comision).`]
        );
        console.log(`[WALLET] +${rewardAmount} RON to referrer ${referrerId} (${cappedPoints}/${rawPoints} pts × ${totalCommission} RON commission)`);
      }
    } catch (e) {
      console.log('[WALLET] Error calculating referral monetary reward:', e.message);
    }
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
