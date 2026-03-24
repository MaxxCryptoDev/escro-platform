import pool from '../config/database.js';
import { autoCreateFinalContract } from './projectController.js';

export const startMilestone = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id } = req.body;

    const milestoneResult = await pool.query(
      'SELECT * FROM milestones WHERE id = $1 AND project_id = $2',
      [milestone_id, project_id]
    );

    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const milestone = milestoneResult.rows[0];

    if (milestone.status !== 'pending') {
      return res.status(400).json({ error: 'Can only start pending milestones' });
    }

    const updatedMilestone = await pool.query(
      `UPDATE milestones SET status = 'in_progress' WHERE id = $1 RETURNING *`,
      [milestone_id]
    );

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

    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const fileUrl = `http://localhost:5000/uploads/deliverables/${file.filename}`;

    const result = await pool.query(
      `UPDATE milestones SET deliverable_file_url = $1, status = 'delivered', completed_at = NOW()
       WHERE id = $2 AND project_id = $3
       RETURNING *`,
      [fileUrl, milestone_id, project_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    res.json({
      success: true,
      milestone: result.rows[0],
      message: 'Deliverable uploaded'
    });
  } catch (error) {
    next(error);
  }
};

export const approveMilestone = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;

    const milestoneResult = await pool.query(
      'SELECT m.*, p.client_id, p.expert_id, p.company_id FROM milestones m JOIN projects p ON m.project_id = p.id WHERE m.id = $1 AND m.project_id = $2',
      [milestone_id, project_id]
    );

    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const milestone = milestoneResult.rows[0];
    const project = milestoneResult.rows[0];

    // Determine party1 and party2 for this milestone
    // party1 = Prestator (expert_id or company_id), party2 = Beneficiar (client_id)
    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    // Check if user is one of the parties
    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Only project parties can approve milestones' });
    }

    // Check if milestone has deliverable
    if (!milestone.deliverable_file_url) {
      return res.status(400).json({ error: 'Cannot approve milestone without deliverable' });
    }

    // Only party2 (client/company) can approve for payment release
    // Expert can mark as reviewed but payment only releases when client approves
    if (userId !== party2Id) {
      return res.status(403).json({ error: 'Doar clientul/beneficiarul poate aproba eliberarea plății' });
    }

    // Client approves - this will release the payment
    const updatedMilestone = await pool.query(
      `UPDATE milestones SET party2_approved = TRUE, party2_approved_at = NOW(), status = 'approved', completed_at = NOW() WHERE id = $1 RETURNING *`,
      [milestone_id]
    );
    const m = updatedMilestone.rows[0];

    // Check if all milestones are approved, then increment completed_projects for both parties
    try {
      const allMilestones = await pool.query(
        'SELECT status FROM milestones WHERE project_id = $1',
        [project_id]
      );
      
      const allApproved = allMilestones.rows.every(ms => ms.status === 'approved' || ms.status === 'released');
      
      if (allApproved) {
        // Auto-create final contract when all milestones are approved
        try {
          await autoCreateFinalContract(project_id);
        } catch (e) {
          console.log('[approveMilestone] Auto-create final contract failed:', e.message);
        }

        // Get project to find prestator and beneficiary
        const projectResult = await pool.query(
          'SELECT expert_id, company_id, client_id FROM projects WHERE id = $1',
          [project_id]
        );
        
        if (projectResult.rows.length > 0) {
          const project = projectResult.rows[0];
          const prestatorId = project.expert_id || project.company_id;
          const beneficiarId = project.client_id;
          
          // Increment for prestator
          if (prestatorId) {
            await pool.query(
              'UPDATE users SET completed_projects = COALESCE(completed_projects, 0) + 1 WHERE id = $1',
              [prestatorId]
            );
            console.log('[DEBUG] Incremented completed_projects for prestator:', prestatorId);
          }
          
          // Increment for beneficiary
          if (beneficiarId) {
            await pool.query(
              'UPDATE users SET completed_projects = COALESCE(completed_projects, 0) + 1 WHERE id = $1',
              [beneficiarId]
            );
            console.log('[DEBUG] Incremented completed_projects for beneficiary:', beneficiarId);
          }
        }
      }
    } catch (countError) {
      console.log('[DEBUG] Error updating completed_projects:', countError.message);
    }

    // Release payment
    try {
      const escrowResult = await pool.query(
        'SELECT e.*, p.commission_percent as project_commission FROM escrow_accounts e JOIN projects p ON e.project_id = p.id WHERE e.project_id = $1',
        [project_id]
      );

      if (escrowResult.rows.length > 0) {
        const escrow = escrowResult.rows[0];
        const commission_percent = escrow.claudiu_commission_percent || escrow.project_commission || 10;
        const release_amount = m.amount_ron || 0;
        const commission_amount = Math.round((release_amount * commission_percent) / 100 * 100) / 100;
        const expert_amount = release_amount - commission_amount;

        await pool.query(
          `INSERT INTO milestone_releases (escrow_id, milestone_id, release_amount_ron, claudiu_commission_amount_ron, expert_amount_ron, released_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [escrow.id, milestone_id, release_amount, commission_amount, expert_amount]
        );

        await pool.query(
          `UPDATE escrow_accounts 
           SET held_balance_ron = COALESCE(held_balance_ron, 0) - $1,
               released_to_expert_total_ron = COALESCE(released_to_expert_total_ron, 0) + $2,
               claudiu_earned_total_ron = COALESCE(claudiu_earned_total_ron, 0) + $3
           WHERE id = $4`,
          [release_amount, expert_amount, commission_amount, escrow.id]
        );
      }
    } catch (escrowError) {
      console.log('Escrow payment processing skipped:', escrowError.message);
    }

    return res.json({
      success: true,
      milestone: m,
      message: 'Milestone aprobat! Plata a fost eliberată către expert.'
    });
  } catch (error) {
    next(error);
  }
};

export const disputeMilestone = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id, reason } = req.body;
    const raised_by = req.user.id;

    const result = await pool.query(
      `INSERT INTO milestone_disputes (milestone_id, raised_by, reason, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING *`,
      [milestone_id, raised_by, reason]
    );

    // Mark project as disputed
    await pool.query(
      `UPDATE projects SET status = 'disputed' WHERE id = $1`,
      [project_id]
    );

    res.status(201).json({
      success: true,
      dispute: result.rows[0],
      message: 'Milestone disputed, waiting for admin arbitration'
    });
  } catch (error) {
    next(error);
  }
};
