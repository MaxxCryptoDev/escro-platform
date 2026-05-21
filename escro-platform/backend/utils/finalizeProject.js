import pool from '../config/database.js';
import { generateFinalContractPDF } from '../services/contractPDF.js';
import trustProfileHooks from '../services/trustProfileHooks.js';
import trustProfileService from '../services/trustProfileService.js';

const POINTS_CONFIG = {
  PROJECT_COMPLETED_POINTS: 10,
};

async function awardProjectCompletionPoints(prestatorId, clientId) {
  for (const userId of [prestatorId, clientId].filter(Boolean)) {
    try {
      await pool.query(
        `UPDATE trust_profiles SET type1_points = type1_points + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [POINTS_CONFIG.PROJECT_COMPLETED_POINTS, userId]
      );
    } catch (e) {
      console.warn(`[PTS] Error awarding completion points for user ${userId}:`, e.message);
    }
  }
}

/**
 * Run all post-finalization side effects for a project:
 *  - increment users.completed_projects for both parties
 *  - award type1 trust points
 *  - trigger referral monetary reward
 *  - create final contract (auto-accepted) + PDF
 *  - notify both parties
 *
 * Idempotent: re-running won't double-increment counters because final contract
 * row uniqueness is guarded (we only create one). Counters could theoretically
 * double-count if called twice; callers should only invoke when project transitions
 * to 'completed' for the first time.
 */
export async function finalizeProject(projectId, { skipCounters = false } = {}) {
  try {
    const projRes = await pool.query(
      `SELECT p.id, p.title, p.client_id, p.expert_id, p.company_id,
              u1.name as expert_name, u1.email as expert_email, u1.company as expert_company, u1.cui as expert_cui,
              u2.name as client_name, u2.email as client_email, u2.company as client_company, u2.cui as client_cui
       FROM projects p
       LEFT JOIN users u1 ON (p.expert_id = u1.id OR p.company_id = u1.id)
       LEFT JOIN users u2 ON p.client_id = u2.id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projRes.rows.length === 0) return { success: false, reason: 'project_not_found' };
    const proj = projRes.rows[0];
    const prestatorId = proj.expert_id || proj.company_id;
    const clientId = proj.client_id;

    // Counters
    if (!skipCounters) {
      if (prestatorId) {
        await pool.query(
          'UPDATE users SET completed_projects = COALESCE(completed_projects, 0) + 1 WHERE id = $1',
          [prestatorId]
        );
      }
      if (clientId) {
        await pool.query(
          'UPDATE users SET completed_projects = COALESCE(completed_projects, 0) + 1 WHERE id = $1',
          [clientId]
        );
      }
    }

    // Trust points + referral wallet bonus — fire-and-forget
    awardProjectCompletionPoints(prestatorId, clientId).catch(e =>
      console.warn('[finalizeProject pts]', e.message)
    );
    trustProfileHooks.triggerReferralMonetaryReward(projectId, proj.expert_id, proj.company_id, clientId)
      .catch(e => console.warn('[finalizeProject wallet]', e.message));

    // Idempotent: skip if final contract already exists
    const existingFinal = await pool.query(
      `SELECT id FROM contracts WHERE project_id = $1 AND contract_type = 'final' LIMIT 1`,
      [projectId]
    );
    if (existingFinal.rows.length === 0) {
      const allMsData = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [projectId]);
      const escrowData = await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1', [projectId]);
      const fcNumber = `FINAL-${Date.now()}`;
      const fcInsert = await pool.query(
        `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id,
                                party1_accepted, party1_accepted_at, party2_accepted, party2_accepted_at,
                                status, contract_number, contract_date)
         VALUES ($1, 'final', $2, $3, true, NOW(), true, NOW(), 'accepted', $4, NOW()) RETURNING id`,
        [projectId, prestatorId, clientId, fcNumber]
      );
      const fcId = fcInsert.rows[0].id;
      const expert = { name: proj.expert_name, email: proj.expert_email, company: proj.expert_company, cui: proj.expert_cui };
      const clientUser = { name: proj.client_name, email: proj.client_email, company: proj.client_company, cui: proj.client_cui };
      const fcObj = { id: fcId, contract_number: fcNumber, contract_date: new Date() };
      const pdfUrl = await generateFinalContractPDF(fcObj, proj, expert, clientUser, allMsData.rows, escrowData.rows[0] || {}).catch(e => {
        console.warn('[finalizeProject PDF]', e.message); return null;
      });
      if (pdfUrl) await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, fcId]);
    }

    // Notify both parties (idempotent — multiple notifications acceptable)
    for (const uid of [prestatorId, clientId].filter(Boolean)) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_completed', 'Proiect finalizat', $2, $3, NOW())`,
        [uid, `Proiectul "${proj.title}" a fost finalizat. Toate milestone-urile au fost aprobate.`, `/project/${projectId}`]
      ).catch(() => {});
    }

    return { success: true };
  } catch (err) {
    console.error('[finalizeProject] Error:', err.message);
    return { success: false, reason: err.message };
  }
}
