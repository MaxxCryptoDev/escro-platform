import pool from '../config/database.js';
import { sendEmailIfEnabled } from '../services/emailService.js';
import { notify } from '../utils/notify.js';
import { emitProjectUpdate } from '../socket.js';
import trustProfileHooks from '../services/trustProfileHooks.js';
import { generateMilestoneContractPDF, generateFinalContractPDF } from '../services/contractPDF.js';
import { validateSignature } from '../utils/validateSignature.js';

// Awards points when a project/task is fully completed (all milestones approved).
// Every participant: +10 trust + +10 reward.
// Each participant's referrer (if any): +10 reward.
async function awardProjectCompletionPoints(prestatorId, clientId) {
  const participants = [prestatorId, clientId].filter(Boolean);
  for (const userId of participants) {
    try {
      const res = await pool.query(
        `UPDATE trust_profiles
         SET type1_points = type1_points + 10,
             trust_score  = trust_score  + 10,
             trust_level  = LEAST(FLOOR((trust_score + 10) / 20)::int, 5),
             updated_at   = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING referred_by`,
        [userId]
      );
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, created_at)
         VALUES ($1, 'points_earned', 'Task finalizat!', 'Ai primit +10 puncte de recompensă și +10 puncte de trust.', NOW())`,
        [userId]
      );

      // Referrer: +10 reward
      const referrerId = res.rows[0]?.referred_by;
      if (referrerId) {
        await pool.query(
          `UPDATE trust_profiles
           SET type1_points = type1_points + 10,
               updated_at   = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [referrerId]
        );
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, 'points_earned', 'Bonus referral!', 'Un utilizator recomandat de tine a finalizat un task. Ai primit +10 puncte de recompensă.', NOW())`,
          [referrerId]
        );
        console.log(`[REFERRAL] +10rw to referrer ${referrerId} for user ${userId} task completion`);
      }

      console.log(`[PTS] +10trust +10rw to user ${userId} for task completion`);
    } catch (e) {
      console.warn(`[PTS] Error awarding completion points for user ${userId}:`, e.message);
    }
  }
}

export const startMilestone = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;

    const milestoneResult = await pool.query(
      `SELECT m.*, p.client_id, p.expert_id, p.company_id
       FROM milestones m JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1 AND m.project_id = $2`,
      [milestone_id, project_id]
    );

    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const milestone = milestoneResult.rows[0];

    // Only the prestator (expert/company) can start a milestone
    const prestatorId = milestone.expert_id || milestone.company_id;
    if (String(userId) !== String(prestatorId)) {
      return res.status(403).json({ message: 'Only the assigned prestator can start this milestone' });
    }

    if (milestone.status !== 'pending') {
      return res.status(400).json({ error: 'Can only start pending milestones' });
    }

    const escrowCheck = await pool.query(
      `SELECT held_balance_ron FROM escrow_accounts WHERE project_id = $1 AND held_balance_ron > 0 LIMIT 1`,
      [project_id]
    );
    if (escrowCheck.rows.length === 0) {
      return res.status(412).json({
        message: 'Nu poți începe lucrul: clientul nu a depus încă fondurile în escrow.'
      });
    }

    const updatedMilestone = await pool.query(
      `UPDATE milestones SET status = 'in_progress' WHERE id = $1 RETURNING *`,
      [milestone_id]
    );

    emitProjectUpdate(milestone.project_id, { type: 'milestone_started', milestone: updatedMilestone.rows[0] });

    res.json({
      success: true,
      milestone: updatedMilestone.rows[0],
      message: 'Milestone started'
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDeliverable = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id } = req.body;
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Verify user is the prestator (expert/company) for this project
    const partyCheck = await pool.query(
      `SELECT p.client_id, p.expert_id, p.company_id
       FROM milestones m JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1 AND m.project_id = $2`,
      [milestone_id, project_id]
    );
    if (partyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    const prestatorId = partyCheck.rows[0].expert_id || partyCheck.rows[0].company_id;
    if (String(userId) !== String(prestatorId)) {
      return res.status(403).json({ message: 'Only the assigned prestator can deliver this milestone' });
    }

    // Require both parties to have signed the project contract before any deliverable
    const contractCheck = await pool.query(
      `SELECT 1 FROM contracts
       WHERE project_id = $1 AND contract_type = 'project'
         AND party1_accepted = TRUE AND party2_accepted = TRUE
       LIMIT 1`,
      [project_id]
    );
    if (contractCheck.rows.length === 0) {
      return res.status(412).json({
        message: 'Nu poți livra: contractul de colaborare nu a fost semnat de ambele părți.'
      });
    }

    // Require escrow to be funded before deliverables can be uploaded
    const escrowCheck = await pool.query(
      `SELECT held_balance_ron FROM escrow_accounts WHERE project_id = $1 AND held_balance_ron > 0 LIMIT 1`,
      [project_id]
    );
    if (escrowCheck.rows.length === 0) {
      return res.status(412).json({
        message: 'Nu poți livra: clientul nu a depus încă fondurile în escrow.'
      });
    }

    // Require predare-primire contract to be signed by prestator before file upload
    const predSigned = await pool.query(
      `SELECT 1 FROM contracts
       WHERE project_id = $1 AND milestone_id = $2 AND contract_type = 'milestone'
         AND party1_id = $3 AND party1_accepted = TRUE LIMIT 1`,
      [project_id, milestone_id, userId]
    );
    if (predSigned.rows.length === 0) {
      return res.status(412).json({
        message: 'Trebuie să semnezi contractul de predare-primire înainte de a livra.'
      });
    }

    const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const fileUrl = `${baseUrl}/uploads/deliverables/${file.filename}`;

    const result = await pool.query(
      `UPDATE milestones SET deliverable_file_url = $1, status = 'delivered', completed_at = NOW(), delivered_at = NOW(), revision_feedback = NULL
       WHERE id = $2 AND project_id = $3
         AND status IN ('pending', 'in_progress', 'revision_requested')
       RETURNING *`,
      [fileUrl, milestone_id, project_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const updatedMs = result.rows[0];

    // Record deliverable history (preserved across revisions for dispute review)
    const versionRes = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM milestone_deliverable_history WHERE milestone_id = $1`,
      [milestone_id]
    );
    const nextVersion = versionRes.rows[0]?.next_version || 1;
    await pool.query(
      `INSERT INTO milestone_deliverable_history
        (milestone_id, file_url, file_name, file_size, description, uploaded_by, version_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [milestone_id, fileUrl, file.originalname || file.filename, file.size || null, req.body?.description || null, userId, nextVersion]
    ).catch(e => console.warn('[deliverable history]', e.message));

    // Notify client that deliverable was uploaded
    const projRes = await pool.query('SELECT client_id, title FROM projects WHERE id = $1', [project_id]);
    if (projRes.rows.length > 0) {
      const { client_id, title: projectTitle } = projRes.rows[0];
      if (client_id) {
        await notify(pool, client_id, 'milestone_delivered', 'Milestone livrat',
          `Prestatorul a livrat milestone-ul "${updatedMs.title}" din proiectul "${projectTitle}". Verifică și aprobă.`,
          `/project/${project_id}`
        );
        sendEmailIfEnabled(pool, client_id, 'milestoneDelivered', {
          projectTitle,
          milestoneTitle: updatedMs.title,
          projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
        }).catch(e => console.warn('[bg]', e.message));
      }
    }

    emitProjectUpdate(project_id, { type: 'milestone_delivered', milestone: updatedMs });

    res.json({
      success: true,
      milestone: updatedMs,
      message: 'Deliverable uploaded'
    });
  } catch (error) {
    next(error);
  }
};

export const approveMilestone = async (req, res, next) => {
  const client = await pool.connect();
  let committed = false;
  try {
    const { milestone_id } = req.params;
    const { project_id, signature } = req.body;
    const userId = req.user.id;

    const sigErr = validateSignature(signature);
    if (sigErr) return res.status(sigErr.status).json({ error: sigErr.error });

    const milestoneResult = await client.query(
      'SELECT m.*, p.client_id, p.expert_id, p.company_id FROM milestones m JOIN projects p ON m.project_id = p.id WHERE m.id = $1 AND m.project_id = $2',
      [milestone_id, project_id]
    );

    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const milestone = milestoneResult.rows[0];
    const project = milestoneResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Only project parties can approve milestones' });
    }

    if (milestone.status !== 'delivered' && !milestone.deliverable_file_url) {
      return res.status(400).json({ error: 'Cannot approve milestone without deliverable' });
    }

    if (userId !== party2Id) {
      return res.status(403).json({ error: 'Doar clientul/beneficiarul poate aproba eliberarea plății' });
    }

    await client.query('BEGIN');

    // Lock the milestone row + re-check status inside transaction to prevent concurrent double-approve
    const lockRes = await client.query(
      `SELECT status FROM milestones WHERE id = $1 FOR UPDATE`,
      [milestone_id]
    );
    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Milestone not found' });
    }
    if (!['delivered', 'in_progress', 'revision_requested'].includes(lockRes.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Milestone already approved or in invalid state' });
    }

    const updatedMilestone = await client.query(
      `UPDATE milestones
       SET party2_approved = TRUE, party2_approved_at = NOW(),
           status = 'approved', approved_at = NOW(), completed_at = NOW()
       WHERE id = $1 AND status IN ('delivered','in_progress','revision_requested')
       RETURNING *`,
      [milestone_id]
    );
    if (updatedMilestone.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Milestone state changed concurrently' });
    }
    const m = updatedMilestone.rows[0];

    // Release payment from escrow — auto-create escrow record if missing (pre-Stripe mode)
    let escrowResult = await client.query(
      'SELECT e.*, p.commission_percent as project_commission FROM escrow_accounts e JOIN projects p ON e.project_id = p.id WHERE e.project_id = $1',
      [project_id]
    );

    if (escrowResult.rows.length === 0) {
      // No escrow account yet — create a virtual one from project milestones total
      const totalsRes = await client.query(
        'SELECT COALESCE(SUM(amount_ron), 0) AS total FROM milestones WHERE project_id = $1',
        [project_id]
      );
      const projCommRes = await client.query('SELECT commission_percent, budget_ron FROM projects WHERE id = $1', [project_id]);
      const total_amount = parseFloat(totalsRes.rows[0].total) || parseFloat(projCommRes.rows[0]?.budget_ron) || 0;
      const commission_pct = parseFloat(projCommRes.rows[0]?.commission_percent) || 10;
      const escrowInsert = await client.query(
        `INSERT INTO escrow_accounts (project_id, total_amount_ron, claudiu_commission_percent, status, held_balance_ron)
         VALUES ($1, $2, $3, 'held', $2) RETURNING *`,
        [project_id, total_amount, commission_pct]
      );
      // Re-fetch with join to get project_commission alias
      escrowResult = await client.query(
        'SELECT e.*, e.claudiu_commission_percent as project_commission FROM escrow_accounts e WHERE e.id = $1',
        [escrowInsert.rows[0].id]
      );
    }

    if (escrowResult.rows.length > 0) {
      const escrow = escrowResult.rows[0];
      const commission_percent = escrow.claudiu_commission_percent || escrow.project_commission || 10;
      const release_amount = m.amount_ron || 0;
      const commission_amount = Math.round((release_amount * commission_percent) / 100 * 100) / 100;
      const expert_amount = release_amount - commission_amount;

      const releaseInsert = await client.query(
        `INSERT INTO milestone_releases (escrow_id, milestone_id, release_amount_ron, claudiu_commission_amount_ron, expert_amount_ron, released_at, stripe_payout_status)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'pending')
         RETURNING id`,
        [escrow.id, milestone_id, release_amount, commission_amount, expert_amount]
      );
      const releaseId = releaseInsert.rows[0].id;

      // Lock + check sufficient funds before deducting
      const heldRes = await client.query(
        `SELECT held_balance_ron FROM escrow_accounts WHERE id = $1 FOR UPDATE`,
        [escrow.id]
      );
      const currentHeld = parseFloat(heldRes.rows[0]?.held_balance_ron) || 0;
      if (currentHeld < release_amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Fonduri insuficiente în escrow. Necesari: ${release_amount} RON, disponibili: ${currentHeld} RON.`
        });
      }

      await client.query(
        `UPDATE escrow_accounts
         SET held_balance_ron = COALESCE(held_balance_ron, 0) - $1,
             released_to_expert_total_ron = COALESCE(released_to_expert_total_ron, 0) + $2,
             claudiu_earned_total_ron = COALESCE(claudiu_earned_total_ron, 0) + $3
         WHERE id = $4`,
        [release_amount, expert_amount, commission_amount, escrow.id]
      );

      // Record in wallet_transactions for the expert/company
      const prestatorCheck = await client.query('SELECT expert_id, company_id FROM projects WHERE id = $1', [project_id]);
      const prestatorId = prestatorCheck.rows[0]?.expert_id || prestatorCheck.rows[0]?.company_id;
      if (prestatorId && expert_amount > 0) {
        await client.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, description, project_id, milestone_release_id)
           VALUES ($1, $2, 'milestone_payment', $3, $4, $5)`,
          [prestatorId, expert_amount, `Milestone aprobat: "${m.title}"`, project_id, releaseId]
        ).catch(e => console.warn('[bg]', e.message));

        // Live Stripe transfer to prestator's Connect account (best-effort: ledger is already correct)
        const isLiveStripe = !!process.env.STRIPE_SECRET_KEY
          && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_4eC39');
        if (isLiveStripe) {
          try {
            const prestRes = await client.query(
              `SELECT stripe_account_id, stripe_transfers_enabled FROM users WHERE id = $1`,
              [prestatorId]
            );
            const prest = prestRes.rows[0];
            if (prest?.stripe_account_id?.startsWith('acct_') && prest.stripe_transfers_enabled) {
              const { default: stripe } = await import('../config/stripe.js');
              const transfer = await stripe.transfers.create({
                amount: Math.round(expert_amount * 100),
                currency: 'ron',
                destination: prest.stripe_account_id,
                description: `ESCRO milestone payout · ${m.title}`,
                metadata: { milestone_id, project_id, release_id: releaseId },
              });
              await client.query(
                `UPDATE milestone_releases SET stripe_transfer_id = $1 WHERE id = $2`,
                [transfer.id, releaseId]
              ).catch(() => {});
            } else {
              console.log('[stripe] prestator nu are Connect activ, banii rămân în wallet');
            }
          } catch (transferErr) {
            console.warn('[stripe transfer milestone]', transferErr.message);
          }
        }
      }
    }

    // Check if all milestones approved → finalize project
    const allMilestones = await client.query(
      'SELECT status FROM milestones WHERE project_id = $1',
      [project_id]
    );
    const allApproved = allMilestones.rows.every(ms => ms.status === 'approved' || ms.status === 'released');

    if (allApproved) {
      await client.query(
        `UPDATE projects SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [project_id]
      );

      setImmediate(async () => {
        try {
          const { runProjectContractBackfill } = await import('./contractController.js');
          await runProjectContractBackfill(project_id);
        } catch (e) {
          console.warn('[auto-backfill milestone]', e.message);
        }
      });

      const projectResult = await client.query(
        'SELECT expert_id, company_id, client_id FROM projects WHERE id = $1',
        [project_id]
      );
      if (projectResult.rows.length > 0) {
        const proj = projectResult.rows[0];
        const prestatorId = proj.expert_id || proj.company_id;
        const beneficiarId = proj.client_id;
        if (prestatorId) {
          await client.query(
            'UPDATE users SET completed_projects = COALESCE(completed_projects, 0) + 1 WHERE id = $1',
            [prestatorId]
          );
        }
        if (beneficiarId) {
          await client.query(
            'UPDATE users SET completed_projects = COALESCE(completed_projects, 0) + 1 WHERE id = $1',
            [beneficiarId]
          );
        }
      }
    }

    await client.query('COMMIT');
    committed = true;

    if (allApproved) {
      awardProjectCompletionPoints(
        project.expert_id || project.company_id,
        project.client_id
      ).catch(e => console.warn('[bg pts]', e.message));

      trustProfileHooks.triggerReferralMonetaryReward(
        project_id,
        project.expert_id,
        project.company_id,
        project.client_id
      ).catch(e => console.warn('[bg wallet]', e.message));
    }

    const prestatorId = project.expert_id || project.company_id;
    const projTitleRes = await pool.query('SELECT title FROM projects WHERE id = $1', [project_id]);
    const projectTitle = projTitleRes.rows[0]?.title || 'proiect';

    // Always create/update delivery contract on milestone approval (signature stored if provided)
    try {
      const fullProjRes = await pool.query(
        `SELECT p.id, p.title, p.client_id, p.expert_id, p.company_id, p.budget_ron,
                u1.name as expert_name, u1.email as expert_email, u1.company as expert_company, u1.cui as expert_cui,
                u2.name as client_name, u2.email as client_email, u2.company as client_company, u2.cui as client_cui
         FROM projects p
         LEFT JOIN users u1 ON (p.expert_id = u1.id OR p.company_id = u1.id)
         LEFT JOIN users u2 ON p.client_id = u2.id
         WHERE p.id = $1`,
        [project_id]
      );
      const proj = fullProjRes.rows[0];
      if (proj) {
        const party1Id_ = proj.expert_id || proj.company_id;
        const party2Id_ = proj.client_id;

        const existingMsContract = await pool.query(
          `SELECT id, contract_number FROM contracts WHERE project_id = $1 AND milestone_id = $2 AND contract_type = 'milestone' LIMIT 1`,
          [project_id, milestone_id]
        );

        let contractId, contractNumber;
        if (existingMsContract.rows.length > 0) {
          contractId = existingMsContract.rows[0].id;
          contractNumber = existingMsContract.rows[0].contract_number;
          // Only update if party2 hasn't signed yet (avoids overwriting a signature added via the ContractModal flow)
          const existingFull = await pool.query('SELECT party2_accepted FROM contracts WHERE id = $1', [contractId]);
          if (!existingFull.rows[0]?.party2_accepted) {
            await pool.query(
              `UPDATE contracts SET party2_signature = $1, party2_signed_at = NOW(),
               party2_accepted = true, party2_accepted_at = NOW(),
               status = CASE WHEN party1_accepted = true THEN 'accepted' ELSE 'pending' END,
               updated_at = NOW() WHERE id = $2`,
              [signature || null, contractId]
            );
          }
        } else {
          contractNumber = `PRED-${Date.now()}`;
          const fallbackTerms = `CONTRACT PREDARE-PRIMIRE\n\nMilestone: ${m.title}\nSumă: ${m.amount_ron} RON`;
          const ins = await pool.query(
            `INSERT INTO contracts (project_id, milestone_id, contract_type, party1_id, party2_id,
               terms, party1_accepted, party1_accepted_at,
               party2_signature, party2_signed_at, party2_accepted, party2_accepted_at,
               status, contract_number, contract_date)
             VALUES ($1, $2, 'milestone', $3, $4, $5, true, NOW(), $6, NOW(), true, NOW(), 'accepted', $7, NOW()) RETURNING id`,
            [project_id, milestone_id, party1Id_, party2Id_, fallbackTerms, signature || null, contractNumber]
          );
          contractId = ins.rows[0].id;
        }

        const contractRec = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const expert = { name: proj.expert_name, email: proj.expert_email, company: proj.expert_company, cui: proj.expert_cui };
        const clientData = { name: proj.client_name, email: proj.client_email, company: proj.client_company, cui: proj.client_cui };
        const pdfUrl = await generateMilestoneContractPDF(
          { ...contractRec.rows[0], contract_date: contractRec.rows[0].contract_date || new Date() },
          proj, expert, clientData, m
        ).catch(e => { console.warn('[PDF] predare-primire:', e.message); return null; });
        if (pdfUrl) await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, contractId]);
      }
    } catch (sigErr) {
      console.warn('[approveMilestone] Delivery contract creation failed:', sigErr.message);
    }

    // Auto-create final contract (auto-accepted) on last milestone approval
    if (allApproved) {
      try {
        const party1Id = project.expert_id || project.company_id;
        const party2Id = project.client_id;
        const fullProjRes = await pool.query(
          `SELECT p.*, u1.name as expert_name, u1.email as expert_email, u1.company as expert_company, u1.cui as expert_cui,
                  u2.name as client_name, u2.email as client_email, u2.company as client_company, u2.cui as client_cui
           FROM projects p
           LEFT JOIN users u1 ON (p.expert_id = u1.id OR p.company_id = u1.id)
           LEFT JOIN users u2 ON p.client_id = u2.id WHERE p.id = $1`,
          [project_id]
        );
        const proj = fullProjRes.rows[0];
        const allMsData = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [project_id]);
        const escrowData = await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1', [project_id]);

        const existingFc = await pool.query(
          `SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'final' LIMIT 1`,
          [project_id]
        );

        let fcId;
        if (existingFc.rows.length > 0) {
          fcId = existingFc.rows[0].id;
          if (!existingFc.rows[0].party2_accepted) {
            await pool.query(
              `UPDATE contracts SET party2_signature = $1, party2_signed_at = NOW(),
               party2_accepted = true, party2_accepted_at = NOW(),
               status = CASE WHEN party1_accepted = true THEN 'accepted' ELSE 'pending' END,
               updated_at = NOW() WHERE id = $2`,
              [signature || null, fcId]
            );
          }
        } else {
          const fcNumber = `FINAL-${Date.now()}`;
          const fcTerms = `CONTRACT FINALIZARE PROIECT\n\nProiect: ${proj.title || ''}\nBuget: ${proj.budget_ron || ''} RON`;
          const fcInsert = await pool.query(
            `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id,
                                    terms, party1_accepted, party1_accepted_at, party2_accepted, party2_accepted_at,
                                    party2_signature, party2_signed_at, status, contract_number, contract_date)
             VALUES ($1, 'final', $2, $3, $4, true, NOW(), true, NOW(), $5, NOW(), 'accepted', $6, NOW()) RETURNING id`,
            [project_id, party1Id, party2Id, fcTerms, signature || null, fcNumber]
          );
          fcId = fcInsert.rows[0].id;
        }

        const expert = { name: proj.expert_name, email: proj.expert_email, company: proj.expert_company, cui: proj.expert_cui };
        const clientUser = { name: proj.client_name, email: proj.client_email, company: proj.client_company, cui: proj.client_cui };
        const fcRec = await pool.query('SELECT * FROM contracts WHERE id = $1', [fcId]);
        const pdfUrl = await generateFinalContractPDF(
          { ...fcRec.rows[0], contract_date: fcRec.rows[0].contract_date || new Date() },
          proj, expert, clientUser, allMsData.rows, escrowData.rows[0] || {}
        ).catch(e => { console.warn('[PDF] Final contract:', e.message); return null; });
        if (pdfUrl) await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, fcId]);

        const clientId = project.client_id;
        if (prestatorId) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link, created_at)
             VALUES ($1, 'project_completed', 'Proiect finalizat', $2, $3, NOW()),
                    ($4, 'project_completed', 'Proiect finalizat', $2, $3, NOW())`,
            [prestatorId, `Proiectul "${projectTitle}" a fost finalizat cu succes! Toate milestone-urile au fost aprobate.`, `/project/${project_id}`, clientId]
          );
        }
      } catch (fcErr) {
        console.warn('[approveMilestone] Final contract auto-create failed:', fcErr.message);
      }
    }

    if (prestatorId) {
      await notify(pool, prestatorId, 'milestone_approved', 'Plată eliberată',
        `Beneficiarul a aprobat milestone-ul "${m.title}" din "${projectTitle}". Plata de ${m.amount_ron} RON a fost eliberată.`,
        `/project/${project_id}`
      );
      sendEmailIfEnabled(pool, prestatorId, 'milestoneApproved', {
        projectTitle,
        milestoneTitle: m.title,
        amountRon: m.amount_ron,
        projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
      }).catch(e => console.warn('[bg]', e.message));
    }

    emitProjectUpdate(project_id, { type: 'milestone_approved', milestone: m, allApproved });

    return res.json({
      success: true,
      milestone: m,
      message: 'Milestone aprobat! Plata a fost eliberată către expert.'
    });
  } catch (error) {
    if (!committed) {
      await client.query('ROLLBACK').catch(e => console.warn('[approveMilestone rollback]', e.message));
      return next(error);
    }
    // Post-commit error: payment already released. Log and return success with a warning.
    console.warn('[approveMilestone] Post-commit error (payment already released):', error.message);
    return res.json({ success: true, message: 'Milestone aprobat (cu avertismente la finalizare — vezi log).' });
  } finally {
    client.release();
  }
};

export const getMyDisputes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT
        md.id, md.status, md.reason, md.claudiu_decision, md.decision_type,
        md.claudiu_release_amount_ron, md.created_at, md.resolved_at,
        md.evidence_files,
        m.id AS milestone_id, m.title AS milestone_title, m.amount_ron AS milestone_amount,
        p.id AS project_id, p.title AS project_title,
        u.name AS raised_by_name,
        u2.name AS other_party_name
      FROM milestone_disputes md
      JOIN milestones m ON md.milestone_id = m.id
      JOIN projects p ON m.project_id = p.id
      JOIN users u ON md.raised_by = u.id
      LEFT JOIN users u2 ON md.other_party_id = u2.id
      WHERE md.raised_by = $1
         OR p.client_id = $1
         OR p.expert_id = $1
         OR p.company_id = $1
      ORDER BY md.created_at DESC
    `, [userId]);
    res.json({ success: true, disputes: result.rows });
  } catch (error) {
    next(error);
  }
};

export const requestRevision = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id, feedback } = req.body;
    const userId = req.user.id;

    const msRes = await pool.query(
      `SELECT m.*, p.client_id, p.expert_id, p.company_id, p.title AS project_title
       FROM milestones m JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1 AND m.project_id = $2`,
      [milestone_id, project_id]
    );
    if (!msRes.rows.length) return res.status(404).json({ error: 'Milestone not found' });
    const ms = msRes.rows[0];

    if (String(userId) !== String(ms.client_id))
      return res.status(403).json({ error: 'Doar beneficiarul poate solicita revizuire.' });
    if (ms.status !== 'delivered')
      return res.status(400).json({ error: 'Revizuirea poate fi solicitată doar după livrare.' });

    const MAX_REVISIONS = 3;
    if ((ms.revision_count || 0) >= MAX_REVISIONS)
      return res.status(400).json({ error: `Numărul maxim de revizuiri (${MAX_REVISIONS}) a fost atins. Deschide o dispută.` });

    if (!feedback?.trim())
      return res.status(400).json({ error: 'Descrie ce trebuie revizuit.' });

    const updated = await pool.query(
      `UPDATE milestones
       SET status = 'revision_requested',
           revision_count = COALESCE(revision_count, 0) + 1,
           revision_feedback = $1
       WHERE id = $2 RETURNING *`,
      [feedback.trim(), milestone_id]
    );

    // Cancel pending predare-primire + final contracts for this milestone so the flow restarts cleanly.
    // Only delete contracts that have NOT been fully accepted by both parties.
    await pool.query(
      `DELETE FROM contracts
       WHERE project_id = $1 AND milestone_id = $2 AND contract_type = 'milestone'
         AND NOT (party1_accepted = TRUE AND party2_accepted = TRUE)`,
      [project_id, milestone_id]
    );
    await pool.query(
      `DELETE FROM contracts
       WHERE project_id = $1 AND contract_type = 'final'
         AND NOT (party1_accepted = TRUE AND party2_accepted = TRUE)`,
      [project_id]
    );

    const prestatorId = ms.expert_id || ms.company_id;
    if (prestatorId) {
      await notify(pool, prestatorId, 'revision_requested', 'Revizuire solicitată',
        `Beneficiarul a solicitat revizuire pentru milestone-ul "${ms.title}" din "${ms.project_title}". Feedback: ${feedback}`,
        `/project/${project_id}`
      );
      sendEmailIfEnabled(pool, prestatorId, 'revisionRequested', {
        projectTitle: ms.project_title,
        milestoneTitle: ms.title,
        feedback,
        projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
      }).catch(e => console.warn('[bg]', e.message));
    }

    emitProjectUpdate(project_id, { type: 'revision_requested', milestone: updated.rows[0] });

    res.json({ success: true, milestone: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const disputeMilestone = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id, reason } = req.body;
    const raised_by = req.user.id;

    // Verify milestone belongs to project and user is a party
    const msCheckRes = await pool.query(
      `SELECT m.status, p.client_id, p.expert_id, p.company_id, p.title
       FROM milestones m JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1 AND m.project_id = $2`,
      [milestone_id, project_id]
    );
    if (msCheckRes.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    const proj = msCheckRes.rows[0];
    const userIsParty = [proj.client_id, proj.expert_id, proj.company_id]
      .filter(Boolean).map(String).includes(String(raised_by));
    if (!userIsParty) {
      return res.status(403).json({ message: 'Only project parties can open disputes' });
    }
    if (!['delivered', 'in_progress', 'revision_requested'].includes(msCheckRes.rows[0].status)) {
      return res.status(400).json({ message: 'Disputes can only be opened on active milestones' });
    }

    const otherPartyId = String(raised_by) === String(proj.client_id)
      ? (proj.expert_id || proj.company_id)
      : proj.client_id;

    const result = await pool.query(
      `INSERT INTO milestone_disputes (milestone_id, raised_by, other_party_id, reason, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING *`,
      [milestone_id, raised_by, otherPartyId || null, reason]
    );

    // Mark milestone + project as disputed — locks the workflow until admin decides
    await pool.query(
      `UPDATE milestones SET status = 'disputed', updated_at = NOW() WHERE id = $1`,
      [milestone_id]
    );
    await pool.query(
      `UPDATE projects SET status = 'disputed' WHERE id = $1`,
      [project_id]
    );

    if (otherPartyId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'milestone_disputed', 'Dispută deschisă', $2, $3, NOW())`,
        [otherPartyId, `A fost deschisă o dispută pentru milestone-ul din proiectul "${proj.title}". Adminul va arbitra.`, `/project/${project_id}`]
      );
      const milestoneTitle = (await pool.query('SELECT title FROM milestones WHERE id = $1', [milestone_id])).rows[0]?.title || 'milestone';
      const disputeEmailData = {
        projectTitle: proj.title,
        milestoneTitle,
        projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
      };
      sendEmailIfEnabled(pool, otherPartyId, 'disputeOpened', disputeEmailData).catch(e => console.warn('[bg]', e.message));
      sendEmailIfEnabled(pool, raised_by, 'disputeOpened', disputeEmailData).catch(e => console.warn('[bg]', e.message));
    }

    emitProjectUpdate(project_id, { type: 'milestone_disputed', milestone_id });

    res.status(201).json({
      success: true,
      dispute: result.rows[0],
      message: 'Milestone disputed, waiting for admin arbitration'
    });
  } catch (error) {
    next(error);
  }
};

// Fetch full upload history for a milestone (all versions, including revisions).
export const getDeliverableHistory = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Permission: must be project party or admin
    const accessRes = await pool.query(
      `SELECT p.client_id, p.expert_id, p.company_id
       FROM milestones m JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1`,
      [milestone_id]
    );
    if (accessRes.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    const p = accessRes.rows[0];
    const isParty = [p.client_id, p.expert_id, p.company_id].filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    const histRes = await pool.query(
      `SELECT h.*, u.name as uploaded_by_name, u.role as uploaded_by_role
       FROM milestone_deliverable_history h
       LEFT JOIN users u ON h.uploaded_by = u.id
       WHERE h.milestone_id = $1
       ORDER BY h.version_number DESC, h.uploaded_at DESC`,
      [milestone_id]
    );
    res.json({ success: true, history: histRes.rows });
  } catch (error) {
    console.error('[getDeliverableHistory]', error);
    next(error);
  }
};

// Admin: release escrow funds for a milestone in chosen direction (client refund or prestator payout).
// Used to resolve disputes by deciding who gets the money.
export const adminReleaseMilestoneFunds = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { milestone_id } = req.params;
    const { direction, amount, reason } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (!['client', 'prestator'].includes(direction)) {
      return res.status(400).json({ error: 'direction trebuie să fie "client" sau "prestator"' });
    }
    const amt = parseFloat(amount);
    if (!(amt > 0)) return res.status(400).json({ error: 'amount trebuie > 0' });

    const msRes = await client.query(
      `SELECT m.*, p.client_id, p.expert_id, p.company_id, p.title as project_title
       FROM milestones m JOIN projects p ON m.project_id = p.id WHERE m.id = $1`,
      [milestone_id]
    );
    if (msRes.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    const ms = msRes.rows[0];
    const prestatorId = ms.expert_id || ms.company_id;

    await client.query('BEGIN');

    const escrowRes = await client.query(
      `SELECT * FROM escrow_accounts WHERE project_id = $1 FOR UPDATE`,
      [ms.project_id]
    );
    if (escrowRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(412).json({ error: 'Nu există escrow pentru acest proiect.' });
    }
    const escrow = escrowRes.rows[0];
    const held = parseFloat(escrow.held_balance_ron) || 0;
    if (held < amt) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Fonduri insuficiente: ${held} RON disponibili, ${amt} RON solicitați.` });
    }

    if (direction === 'prestator') {
      const commissionPct = parseFloat(escrow.claudiu_commission_percent) || 10;
      const commissionAmt = Math.round(amt * commissionPct / 100 * 100) / 100;
      const expertAmt = amt - commissionAmt;
      const relIns = await client.query(
        `INSERT INTO milestone_releases (escrow_id, milestone_id, release_amount_ron, claudiu_commission_amount_ron, expert_amount_ron, released_at, stripe_payout_status)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'pending') RETURNING id`,
        [escrow.id, milestone_id, amt, commissionAmt, expertAmt]
      );
      const releaseId = relIns.rows[0].id;
      await client.query(
        `UPDATE escrow_accounts SET
          held_balance_ron = GREATEST(0, COALESCE(held_balance_ron, 0) - $1),
          released_to_expert_total_ron = COALESCE(released_to_expert_total_ron, 0) + $2,
          claudiu_earned_total_ron = COALESCE(claudiu_earned_total_ron, 0) + $3
         WHERE id = $4`,
        [amt, expertAmt, commissionAmt, escrow.id]
      );
      if (prestatorId && expertAmt > 0) {
        await client.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, description, project_id, milestone_release_id)
           VALUES ($1, $2, 'milestone_payment', $3, $4, $5)`,
          [prestatorId, expertAmt, `Admin a eliberat fonduri pentru "${ms.title}"${reason ? ': ' + reason : ''}`, ms.project_id, releaseId]
        );

        const isLiveStripe = !!process.env.STRIPE_SECRET_KEY
          && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_4eC39');
        if (isLiveStripe) {
          try {
            const prestRes = await client.query(
              `SELECT stripe_account_id, stripe_transfers_enabled FROM users WHERE id = $1`,
              [prestatorId]
            );
            const prest = prestRes.rows[0];
            if (prest?.stripe_account_id?.startsWith('acct_') && prest.stripe_transfers_enabled) {
              const { default: stripe } = await import('../config/stripe.js');
              const transfer = await stripe.transfers.create({
                amount: Math.round(expertAmt * 100),
                currency: 'ron',
                destination: prest.stripe_account_id,
                description: `ESCRO admin release · ${ms.title}`,
                metadata: { milestone_id, project_id: ms.project_id, release_id: releaseId, admin_initiated: 'true' },
              }, { idempotencyKey: `admin_release_${releaseId}` });
              await client.query(
                `UPDATE milestone_releases SET stripe_transfer_id = $1 WHERE id = $2`,
                [transfer.id, releaseId]
              ).catch(() => {});
            } else {
              console.log('[stripe] admin release: prestator nu are Connect activ, banii rămân în wallet');
            }
          } catch (transferErr) {
            console.warn('[stripe transfer admin-release]', transferErr.message);
          }
        }
      }
      await client.query(
        `UPDATE milestones SET status = 'released' WHERE id = $1 AND status NOT IN ('approved','released')`,
        [milestone_id]
      );
    } else {
      // Refund to client wallet
      await client.query(
        `UPDATE escrow_accounts SET
          held_balance_ron = GREATEST(0, COALESCE(held_balance_ron, 0) - $1)
         WHERE id = $2`,
        [amt, escrow.id]
      );
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, type, description, project_id)
         VALUES ($1, $2, 'refund', $3, $4)`,
        [ms.client_id, amt, `Refund admin pentru "${ms.title}"${reason ? ': ' + reason : ''}`, ms.project_id]
      );
    }

    // Notifications
    for (const uid of [ms.client_id, prestatorId].filter(Boolean)) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'admin_release', 'Decizie admin', $2, $3, NOW())`,
        [uid, `Admin a decis pentru milestone-ul "${ms.title}": ${amt} RON spre ${direction === 'client' ? 'beneficiar' : 'prestator'}.`, `/project/${ms.project_id}`]
      ).catch(() => {});
    }

    await client.query('COMMIT');
    res.json({ success: true, direction, amount: amt });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[adminReleaseMilestoneFunds]', error);
    next(error);
  } finally {
    client.release();
  }
};
