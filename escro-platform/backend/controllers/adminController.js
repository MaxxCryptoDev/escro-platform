import pool from '../config/database.js';
import trustProfileHooks from '../services/trustProfileHooks.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, company, portfolio_description, role, kyc_status, created_at, profile_image_url, expertise, bio, industry, experience 
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const verifyExpert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { kyc_status } = req.body;

    if (!['verified', 'rejected'].includes(kyc_status)) {
      return res.status(400).json({ message: 'Invalid KYC status' });
    }

    // First, check if user exists and what role they have
    const checkResult = await pool.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [id]
    );

    const result = await pool.query(
      `UPDATE users SET kyc_status = $1, verification_date = NOW() WHERE id = $2 RETURNING *`,
      [kyc_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await trustProfileHooks.triggerKYCVerification(id, kyc_status);

    res.json({
      success: true,
      user: result.rows[0],
      message: `User ${kyc_status}`
    });
  } catch (error) {
    console.error('Error in verifyExpert:', error);
    next(error);
  }
};

export const getPendingExperts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, company, kyc_status, created_at FROM users WHERE role = 'expert' AND kyc_status = 'pending' ORDER BY created_at ASC`
    );

    res.json({
      success: true,
      experts: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getVerifiedExperts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, company, expertise, bio, verification_date FROM users WHERE role = 'expert' AND kyc_status = 'verified' ORDER BY name ASC`
    );

    res.json({
      success: true,
      experts: result.rows
    });
  } catch (error) {
    next(error);
  }
};



export const resolveMilestoneDispute = async (req, res, next) => {
  try {
    const { dispute_id } = req.params;
    const { claudiu_release_amount_ron, decision_text } = req.body;

    const result = await pool.query(
      `UPDATE milestone_disputes 
       SET claudiu_decision = $1, claudiu_release_amount_ron = $2, status = 'resolved', resolved_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [decision_text, claudiu_release_amount_ron, dispute_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    const dispute = result.rows[0];

    // Get milestone and project
    const milestoneResult = await pool.query(
      'SELECT * FROM milestones WHERE id = $1',
      [dispute.milestone_id]
    );

    const milestone = milestoneResult.rows[0];

    // Get escrow
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [milestone.project_id]
    );

    const escrowResult = await pool.query(
      'SELECT e.*, p.commission_percent as project_commission FROM escrow_accounts e JOIN projects p ON e.project_id = p.id WHERE e.project_id = $1',
      [milestone.project_id]
    );

    const escrow = escrowResult.rows[0];

    // Calculate and deduct commission
    const commission_percent = escrow.claudiu_commission_percent || escrow.project_commission || 10;
    const release_amount = claudiu_release_amount_ron;
    const commission_amount = Math.round((release_amount * commission_percent) / 100 * 100) / 100;
    const expert_amount = release_amount - commission_amount;

    // Record payment
    await pool.query(
      `INSERT INTO milestone_releases (escrow_id, milestone_id, release_amount_ron, claudiu_commission_amount_ron, expert_amount_ron, released_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [escrow.id, milestone.id, release_amount, commission_amount, expert_amount]
    );

    // Update escrow
    await pool.query(
      `UPDATE escrow_accounts 
       SET held_balance_ron = held_balance_ron - $1,
           released_to_expert_total_ron = released_to_expert_total_ron + $2,
           claudiu_earned_total_ron = claudiu_earned_total_ron + $3
       WHERE id = $4`,
      [release_amount, expert_amount, commission_amount, escrow.id]
    );

    res.json({
      success: true,
      dispute: dispute,
      payment: {
        release_amount,
        commission_amount,
        expert_amount
      },
      message: 'Dispute resolved'
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminDashboard = async (req, res, next) => {
  try {
    const projectsResult = await pool.query('SELECT COUNT(*) FROM projects');
    const expertsResult = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND kyc_status = $2', ['expert', 'verified']);
    const disputesResult = await pool.query('SELECT COUNT(*) FROM milestone_disputes WHERE status = $1', ['pending']);
    // const revenueResult = await pool.query('SELECT SUM(claudiu_earned_total_ron) FROM escrow_accounts');

    res.json({
      success: true,
      stats: {
        total_projects: parseInt(projectsResult.rows[0].count),
        verified_experts: parseInt(expertsResult.rows[0].count),
        pending_disputes: parseInt(disputesResult.rows[0].count),
        total_revenue: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, company, created_at FROM users WHERE kyc_status = 'pending' OR kyc_status IS NULL ORDER BY created_at ASC`
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getVerifiedCompanies = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        company, 
        COUNT(*) as user_count,
        STRING_AGG(DISTINCT email, ', ' ORDER BY email) as emails
      FROM users 
      WHERE kyc_status = 'verified' AND role = 'expert' AND company IS NOT NULL AND company != ''
      GROUP BY company
      ORDER BY user_count DESC, company ASC`
    );

    res.json({
      success: true,
      companies: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const approveUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user KYC status
      const userResult = await client.query(
        `UPDATE users SET kyc_status = 'verified', verification_date = NOW() WHERE id = $1 RETURNING id, email, name, role`,
        [user_id]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Get trust profile
      const trustResult = await client.query(
        `SELECT * FROM trust_profiles WHERE user_id = $1`,
        [user_id]
      );

      if (trustResult.rows.length > 0) {
        const profile = trustResult.rows[0];
        
        // Calculate points to add
        let pointsToAdd = 0;
        let updates = [];
        
        // is_known_directly_by_admin = 20 puncte
        if (!profile.is_known_directly_by_admin) {
          pointsToAdd += 20;
          updates.push('is_known_directly_by_admin = true');
        }
        
        // has_verification_call = 15 puncte (should be set from verification)
        if (profile.has_verification_call && profile.type2_points < 35) {
          pointsToAdd += 15;
        }
        
        // Award type2 points for admin connection
        if (pointsToAdd > 0 || updates.length > 0) {
          let updateParts = [];
          if (pointsToAdd > 0) {
            updateParts.push(`type2_points = type2_points + ${pointsToAdd}, trust_score = trust_score + ${pointsToAdd}`);
          }
          updateParts.push(...updates);
          updateParts.push('updated_at = NOW()');
          
          const updateQuery = `UPDATE trust_profiles SET ${updateParts.join(', ')} WHERE user_id = $1`;
          await client.query(updateQuery, [user_id]);
        }

        // If referred by admin = Level 5 with 100 score
        const referredBy = trustResult.rows[0]?.referred_by;
        if (referredBy) {
          const referrerResult = await client.query(
            `SELECT id, role FROM users WHERE id = $1`,
            [referredBy]
          );
          
          if (referrerResult.rows.length > 0 && referrerResult.rows[0].role === 'admin') {
            await client.query(
              `UPDATE trust_profiles SET trust_level = 5, trust_score = 100, type2_points = 35, updated_at = NOW() WHERE user_id = $1`,
              [user_id]
            );
          }
          
          // Award 10 type1 points to referrer
          await client.query(
            `UPDATE trust_profiles SET 
              type1_points = type1_points + 10,
              updated_at = NOW()
            WHERE user_id = $1`,
            [referredBy]
          );
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User approved and trust profile updated',
        user: userResult.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const rejectUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `UPDATE users SET kyc_status = 'rejected', verification_date = NOW() WHERE id = $1 RETURNING id, email, name, role, kyc_status`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User rejected',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { user_id } = req.params;

    await client.query('BEGIN');

    // Get all project IDs where user is involved
    const userProjects = await client.query(
      `SELECT id FROM projects WHERE client_id = $1 OR expert_id = $1 OR company_id = $1 OR posted_by_expert = $1 OR posted_by_client = $1`,
      [user_id]
    );
    const projectIds = userProjects.rows.map(p => p.id);

    if (projectIds.length > 0) {
      // Delete milestone-related records for these projects
      await client.query(`
        DELETE FROM milestone_disputes WHERE milestone_id IN (
          SELECT id FROM milestones WHERE project_id = ANY($1)
        )
      `, [projectIds]);
      
      await client.query(`
        DELETE FROM milestone_releases WHERE milestone_id IN (
          SELECT id FROM milestones WHERE project_id = ANY($1)
        )
      `, [projectIds]);
      
      // Delete milestones
      await client.query('DELETE FROM milestones WHERE project_id = ANY($1)', [projectIds]);
      
      // Delete contracts
      await client.query('DELETE FROM contracts WHERE project_id = ANY($1)', [projectIds]);
      
      // Delete messages
      await client.query('DELETE FROM messages WHERE project_id = ANY($1)', [projectIds]);
      
      // Delete task_requests
      await client.query('DELETE FROM task_requests WHERE project_id = ANY($1)', [projectIds]);
      
      // Delete escrow accounts
      await client.query('DELETE FROM escrow_accounts WHERE project_id = ANY($1)', [projectIds]);
      
      // Delete projects
      await client.query('DELETE FROM projects WHERE id = ANY($1)', [projectIds]);
    }

    // Delete remaining user-related records
    await client.query('DELETE FROM badges WHERE user_id = $1', [user_id]);
    await client.query('DELETE FROM verification_calls WHERE user_id = $1', [user_id]);
    await client.query('DELETE FROM portfolio_items WHERE user_id = $1', [user_id]);
    await client.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [user_id]);
    await client.query('DELETE FROM messages WHERE sender_id = $1 OR recipient_id = $1', [user_id]);
    await client.query('DELETE FROM milestone_disputes WHERE raised_by = $1', [user_id]);
    await client.query('DELETE FROM task_requests WHERE user_id = $1', [user_id]);
    await client.query('DELETE FROM disputes WHERE initiator_id = $1', [user_id]);
    
    // Delete contracts where user is party
    await client.query('DELETE FROM contracts WHERE party1_id = $1 OR party2_id = $1', [user_id]);
    
    // Delete the user
    const result = await client.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, email, name`,
      [user_id]
    );

    await client.query('COMMIT');

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted',
      user: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getAllProjects = async (req, res, next) => {
  try {
    // Get all regular projects only - no PM tasks (they are shown in user dashboards)
    const projectsResult = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.company_id, p.task_id, p.assignment_type, p.service_type, p.title, p.description, p.budget_ron, p.timeline_days, p.status, p.created_at, p.updated_at, p.posted_by_expert, p.posted_by_client, p.expert_posting_status, p.client_posting_status, u.name as client_name, e.name as expert_name, e.profile_image_url as expert_profile_image_url, c.name as company_name, c.profile_image_url as company_profile_image_url
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       ORDER BY p.created_at DESC`
    );

    res.json({
      success: true,
      projects: projectsResult.rows
    });
  } catch (error) {
    console.error('[ERROR] getAllProjects failed:', error.message);
    next(error);
  }
};

// Get projects pending admin approval (only PM tasks - matching projects wait for their PM to be approved)
export const getPendingApprovalProjects = async (req, res, next) => {
  try {
    // Only get PM tasks pending approval - matching projects wait until PM is approved
    const tasksResult = await pool.query(
      `SELECT t.id, t.client_id, t.title, t.description, t.budget_ron, t.timeline_days, t.status as task_status, t.created_at, t.updated_at,
              'project_management' as service_type, t.id as task_id, 'pm_task' as assignment_type,
              u.name as client_name, u.email as client_email, u.company as client_company, u.phone as client_phone, u.profile_image_url as client_profile_image_url,
              t.status as status
       FROM tasks t
       LEFT JOIN users u ON t.client_id = u.id
       WHERE t.status = 'pending_admin_approval'
       ORDER BY t.created_at ASC`
    );
    
    console.log('[DEBUG] Pending PM tasks:', tasksResult.rows.length);

    res.json({
      success: true,
      projects: tasksResult.rows
    });
  } catch (error) {
    console.error('[ERROR] getPendingApprovalProjects failed:', error.message);
    next(error);
  }
};

export const approveProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { service_type, commission_percent, assignment_type } = req.body;

    // Check if this is a PM task (from tasks table)
    if (assignment_type === 'pm_task') {
      // Approving a PM task - only update the task status to in_progress
      // Do NOT touch the matching collaboration project - it needs separate approval
      const taskResult = await pool.query(
        `SELECT id, status FROM tasks WHERE id = $1`,
        [project_id]
      );

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Update task status to in_progress (not open - it's now active)
      await pool.query(
        `UPDATE tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [project_id]
      );

      // Do NOT update the matching collaboration - it needs separate approval

      return res.json({
        success: true,
        message: 'PM Task approved and is now in progress'
      });
    }

    // Normal project approval (matching, direct, etc.)
    // If this is a task_assignment (matching), also update the PM task status to open
    const projectResult = await pool.query(
      `SELECT id, status, service_type, task_id FROM projects WHERE id = $1`,
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    if (project.status !== 'pending_admin_approval') {
      return res.status(400).json({ error: 'Project is not pending admin approval' });
    }

    // Preserve existing service_type - never overwrite it
    const currentServiceType = project.service_type || 'matching';
    const safeCommissionPercent = commission_percent ? Math.min(50, Math.max(1, commission_percent)) : 10;

    // If this is a task_assignment (matching), also update the PM parent task to in_progress
    if (project.task_id) {
      // Update the task to in_progress (collaboration is now active)
      await pool.query(
        `UPDATE tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [project.task_id]
      );
    }

    // For project_management, set to in_progress; for matching/direct, set to open (available for experts)
    const newStatus = currentServiceType === 'project_management' ? 'in_progress' : 'open';
    
    // Update project status
    const updateResult = await pool.query(
      `UPDATE projects SET status = $1, commission_percent = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [newStatus, safeCommissionPercent, project_id]
    );

    const statusMessage = currentServiceType === 'project_management' ? 'Project Management task is now in progress' : 'Project approved and is now visible to experts';
    res.json({
      success: true,
      message: statusMessage,
      project: updateResult.rows[0]
    });
  } catch (error) {
    console.error('[ERROR] approveProject failed:', error.message);
    next(error);
  }
};

export const rejectProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { reason } = req.body;

    // Get current project
    const projectResult = await pool.query(
      `SELECT id, status FROM projects WHERE id = $1`,
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    if (project.status !== 'pending_admin_approval') {
      return res.status(400).json({ error: 'Project is not pending admin approval' });
    }

    // Update project status to rejected
    const updateResult = await pool.query(
      `UPDATE projects SET status = 'rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
      [reason || null, project_id]
    );

    res.json({
      success: true,
      message: 'Project rejected',
      project: updateResult.rows[0]
    });
  } catch (error) {
    console.error('[ERROR] rejectProject failed:', error.message);
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    // Delete related records first - in correct order
    await pool.query('DELETE FROM milestone_disputes WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = $1)', [project_id]);
    await pool.query('DELETE FROM milestone_releases WHERE milestone_id IN (SELECT id FROM milestones WHERE project_id = $1)', [project_id]);
    // Delete contracts BEFORE milestones (contracts reference milestones)
    await pool.query('DELETE FROM contracts WHERE project_id = $1', [project_id]);
    await pool.query('DELETE FROM milestones WHERE project_id = $1', [project_id]);
    await pool.query('DELETE FROM messages WHERE project_id = $1', [project_id]);
    await pool.query('DELETE FROM task_requests WHERE project_id = $1', [project_id]);
    await pool.query('DELETE FROM escrow_accounts WHERE project_id = $1', [project_id]);
    
    const result = await pool.query(
      `DELETE FROM projects WHERE id = $1 RETURNING id, title`,
      [project_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project deleted',
      project: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const assignExpertToProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { expert_id } = req.body;

    if (!expert_id) {
      return res.status(400).json({ success: false, message: 'Expert/Company ID required' });
    }

    // Check user role to determine which field to update
    const userCheck = await pool.query(
      `SELECT id, role, name FROM users WHERE id = $1 AND kyc_status = 'verified'`,
      [expert_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Expert/Company not verified' });
    }

    const userRole = userCheck.rows[0].role;
    const userName = userCheck.rows[0].name;

    // Update based on role - expert goes to expert_id, company goes to company_id
    // For expert-posted tasks, we keep posted_by_expert and set company_id
    let updateQuery, updateParams;
    if (userRole === 'expert') {
      updateQuery = `UPDATE projects SET expert_id = $1, status = 'in_progress' WHERE id = $2`;
    } else {
      // For companies - keep the original expert (posted_by_expert) but set company_id for the assigned company
      // Also set client_id to track which company was selected
      updateQuery = `UPDATE projects SET company_id = $1, status = 'in_progress' WHERE id = $2`;
    }
    
    await pool.query(updateQuery, [expert_id, project_id]);

    // If this is a task_assignment (collaboration), also update the PM parent task to in_progress
    const projectCheck = await pool.query(
      `SELECT task_id FROM projects WHERE id = $1`,
      [project_id]
    );
    
    if (projectCheck.rows.length > 0 && projectCheck.rows[0].task_id) {
      await pool.query(
        `UPDATE tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [projectCheck.rows[0].task_id]
      );
    }

    // Get the updated project with details
    const result = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.company_id, p.title, p.description, p.budget_ron, p.timeline_days, p.status, p.created_at, p.updated_at, p.posted_by_expert, p.posted_by_client, p.expert_posting_status, p.client_posting_status,
              u.name as client_name, 
              e.name as expert_name, e.role as expert_role, e.profile_image_url as expert_profile_image_url,
              c.name as company_name, c.company as company_company_name, c.profile_image_url as company_profile_image_url
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       WHERE p.id = $1`,
      [project_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const assignedType = userRole === 'expert' ? 'Expert' : 'Company';
    res.json({
      success: true,
      message: `${assignedType} ${userName} assigned to project and status updated`,
      project: result.rows[0]
    });
  } catch (error) {
    console.error('assignExpertToProject error:', error);
    next(error);
  }
};

export const removeExpertFromProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const result = await pool.query(
      `UPDATE projects SET expert_id = NULL, status = 'pending_assignment' WHERE id = $1 RETURNING *`,
      [project_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Expert removed from project',
      project: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const fixMilestonesSchema = async (req, res, next) => {
  try {
    console.log('🔧 Starting milestones fix...');
    
    // Step 1: Add missing columns
    console.log('Adding missing columns...');
    const columns_to_add = [
      { name: 'order_number', type: 'INTEGER' },
      { name: 'deliverable_description', type: 'TEXT' },
      { name: 'percentage_of_budget', type: 'DECIMAL(5, 2)' },
      { name: 'amount_ron', type: 'DECIMAL(12, 2)' }
    ];

    for (const col of columns_to_add) {
      try {
        const checkResult = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'milestones' AND column_name = $1`,
          [col.name]
        );
        
        if (checkResult.rows.length === 0) {
          await pool.query(`ALTER TABLE milestones ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✓ Added column: ${col.name}`);
        } else {
          console.log(`✓ Column already exists: ${col.name}`);
        }
      } catch (e) {
        console.log(`  Column ${col.name} might already exist, skipping...`);
      }
    }

    // Step 2: Find or create "bla bla" project
    console.log('\nFinding/creating "bla bla" project...');
    let projectResult = await pool.query(
      "SELECT id, budget_ron FROM projects WHERE title = 'bla bla'"
    );

    let projectId, budgetRon;
    if (projectResult.rows.length === 0) {
      projectResult = await pool.query(
        `INSERT INTO projects (title, description, budget_ron, timeline_days, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, budget_ron`,
        ['bla bla', 'Test project', 5000, 30, 'open']
      );
      projectId = projectResult.rows[0].id;
      budgetRon = projectResult.rows[0].budget_ron;
      console.log('✓ Created "bla bla" project');
    } else {
      projectId = projectResult.rows[0].id;
      budgetRon = projectResult.rows[0].budget_ron;
      console.log('✓ Found "bla bla" project');
    }

    // Step 3: Clear and add milestones
    console.log('\nAdding milestones...');
    await pool.query('DELETE FROM milestones WHERE project_id = $1', [projectId]);

    const milestones = [
      {
        title: 'Design & Planning',
        description: 'Design & Planning',
        deliverable: 'Project design document and planning deliverables',
        percentage: 25
      },
      {
        title: 'Development & Implementation',
        description: 'Development & Implementation',
        deliverable: 'Core development and implementation deliverables',
        percentage: 75
      }
    ];

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const amount = budgetRon * (m.percentage / 100);
      
      await pool.query(
        `INSERT INTO milestones (project_id, order_number, title, description, 
                                 deliverable_description, percentage_of_budget, amount_ron, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [projectId, i + 1, m.title, m.description, m.deliverable, m.percentage, amount, 'pending']
      );
      console.log(`✓ Added milestone: ${m.title} (${m.percentage}% = ${amount} RON)`);
    }

    console.log('\n✅ Milestones fixed successfully!');
    
    res.json({
      success: true,
      message: 'Milestones fixed successfully',
      projectId,
      milestonesAdded: 2
    });
  } catch (error) {
    console.error('❌ Error:', error);
    next(error);
  }
};

// Task Requests Management
export const getPendingTaskRequests = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        tr.id,
        tr.user_id,
        tr.project_id,
        tr.message,
        tr.status,
        tr.created_at,
        u.name as user_name,
        u.email as user_email,
        u.role,
        u.company,
        p.title as project_title,
        p.description as project_description,
        c.name as client_name
      FROM task_requests tr
      JOIN users u ON tr.user_id = u.id
      JOIN projects p ON tr.project_id = p.id
      JOIN users c ON p.client_id = c.id
      WHERE tr.status = 'pending'
      ORDER BY tr.created_at DESC`
    );

    console.log('[DEBUG] getPendingTaskRequests - Found', result.rows.length, 'pending requests');

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('[ERROR] getPendingTaskRequests failed:', error.message);
    next(error);
  }
};

export const approveTaskRequest = async (req, res, next) => {
  try {
    const { request_id } = req.params;
    console.log('[DEBUG] approveTaskRequest called with request_id:', request_id);

    // First, get the task request to get user_id and project_id
    const taskRequestResult = await pool.query(
      `SELECT * FROM task_requests WHERE id = $1`,
      [request_id]
    );

    if (taskRequestResult.rows.length === 0) {
      console.log('[DEBUG] Task request not found:', request_id);
      return res.status(404).json({ success: false, message: 'Task request not found' });
    }

    const taskRequest = taskRequestResult.rows[0];
    console.log('[DEBUG] Task request details:', { user_id: taskRequest.user_id, project_id: taskRequest.project_id });

    // Update task request status
    const result = await pool.query(
      `UPDATE task_requests SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [request_id]
    );

    // Also update the project with expert_id and set status to 'assigned'
    const updateResult = await pool.query(
      `UPDATE projects SET expert_id = $1, status = 'assigned', updated_at = NOW() WHERE id = $2 RETURNING *`,
      [taskRequest.user_id, taskRequest.project_id]
    );

    console.log('[DEBUG] Project update result:', updateResult.rows[0]);
    console.log('[DEBUG] Task request approved and project assigned:', request_id);

    res.json({
      success: true,
      message: 'Task request approved',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('[ERROR] approveTaskRequest failed:', error.message);
    next(error);
  }
};

export const rejectTaskRequest = async (req, res, next) => {
  try {
    const { request_id } = req.params;
    console.log('[DEBUG] rejectTaskRequest called with request_id:', request_id);

    const result = await pool.query(
      `UPDATE task_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [request_id]
    );

    if (result.rows.length === 0) {
      console.log('[DEBUG] Task request not found:', request_id);
      return res.status(404).json({ success: false, message: 'Task request not found' });
    }

    console.log('[DEBUG] Task request rejected:', request_id);

    res.json({
      success: true,
      message: 'Task request rejected',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('[ERROR] rejectTaskRequest failed:', error.message);
    next(error);
  }
};
/**
 * Get pending expert-posted tasks (for admin approval)
 */
export const getPendingExpertPostedTasks = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.budget_ron,
        p.timeline_days,
        p.status,
        p.expert_posting_status,
        p.expert_posting_message,
        p.created_at,
        u.name as expert_name,
        u.email as expert_email,
        u.company as expert_company,
        u.expertise as expert_expertise,
        u.profile_image_url as expert_profile_image_url,
        COUNT(m.id) as milestone_count
      FROM projects p
      JOIN users u ON p.posted_by_expert = u.id
      LEFT JOIN milestones m ON p.id = m.project_id
      WHERE p.posted_by_expert IS NOT NULL AND p.expert_posting_status = 'pending'
      GROUP BY p.id, u.id
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query);
    console.log('[DEBUG] getPendingExpertPostedTasks - Found', result.rows.length, 'pending expert tasks');

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[ERROR] getPendingExpertPostedTasks failed:', error.message);
    next(error);
  }
};

/**
 * Approve expert-posted task
 */
export const approveExpertPostedTask = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    console.log('[DEBUG] approveExpertPostedTask called with project_id:', project_id);

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update project
      const result = await pool.query(
        `UPDATE projects 
         SET expert_posting_status = 'approved', status = 'open', updated_at = NOW() 
         WHERE id = $1 AND posted_by_expert IS NOT NULL
         RETURNING id, title, expert_posting_status, status`,
        [project_id]
      );

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Expert-posted task not found' });
      }

      await pool.query('COMMIT');
      console.log('[DEBUG] Expert-posted task approved:', project_id);

      res.json({
        success: true,
        message: 'Expert-posted task approved! Companies can now see it.',
        data: result.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('[ERROR] approveExpertPostedTask failed:', error.message);
    next(error);
  }
};

/**
 * Reject expert-posted task
 */
export const rejectExpertPostedTask = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { reason } = req.body;
    
    console.log('[DEBUG] rejectExpertPostedTask called with project_id:', project_id, 'reason:', reason);

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update project
      const result = await pool.query(
        `UPDATE projects 
         SET expert_posting_status = 'rejected', status = 'rejected', updated_at = NOW() 
         WHERE id = $1 AND posted_by_expert IS NOT NULL
         RETURNING id, title, expert_posting_status, status`,
        [project_id]
      );

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Expert-posted task not found' });
      }

      await pool.query('COMMIT');
      console.log('[DEBUG] Expert-posted task rejected:', project_id);

      res.json({
        success: true,
        message: 'Expert-posted task rejected.',
        data: result.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('[ERROR] rejectExpertPostedTask failed:', error.message);
    next(error);
  }
};

/**
 * Get pending client-posted tasks for admin approval
 */
export const getPendingClientPostedTasks = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.budget_ron,
        p.timeline_days,
        p.status,
        p.client_posting_status,
        p.client_posting_message,
        p.created_at,
        u.name as company_name,
        u.email as company_email,
        u.company,
        u.profile_image_url as company_profile_image_url,
        u.role as assigned_user_role,
        p.company_id,
        COUNT(m.id) as milestone_count
      FROM projects p
      JOIN users u ON p.posted_by_client = u.id
      LEFT JOIN milestones m ON p.id = m.project_id
      WHERE p.posted_by_client IS NOT NULL AND p.client_posting_status = 'pending'
      GROUP BY p.id, u.id
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query);
    console.log('[DEBUG] getPendingClientPostedTasks - Found', result.rows.length, 'pending client tasks');

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[ERROR] getPendingClientPostedTasks failed:', error.message);
    next(error);
  }
};

/**
 * Approve client-posted task
 */
export const approveClientPostedTask = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    console.log('[DEBUG] approveClientPostedTask called with project_id:', project_id);

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update project
      const result = await pool.query(
        `UPDATE projects 
         SET client_posting_status = 'approved', status = 'open', updated_at = NOW() 
         WHERE id = $1 AND posted_by_client IS NOT NULL
         RETURNING id, title, client_posting_status, status`,
        [project_id]
      );

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Client-posted task not found' });
      }

      await pool.query('COMMIT');
      console.log('[DEBUG] Client-posted task approved:', project_id);

      res.json({
        success: true,
        message: 'Client-posted task approved! Experts can now see it.',
        data: result.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('[ERROR] approveClientPostedTask failed:', error.message);
    next(error);
  }
};

/**
 * Reject client-posted task
 */
export const rejectClientPostedTask = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { reason } = req.body;
    
    console.log('[DEBUG] rejectClientPostedTask called with project_id:', project_id, 'reason:', reason);

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update project
      const result = await pool.query(
        `UPDATE projects 
         SET client_posting_status = 'rejected', status = 'rejected', updated_at = NOW() 
         WHERE id = $1 AND posted_by_client IS NOT NULL
         RETURNING id, title, client_posting_status, status`,
        [project_id]
      );

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Client-posted task not found' });
      }

      await pool.query('COMMIT');
      console.log('[DEBUG] Client-posted task rejected:', project_id);

      res.json({
        success: true,
        message: 'Client-posted task rejected.',
        data: result.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('[ERROR] rejectClientPostedTask failed:', error.message);
    next(error);
  }
};

/**
 * Assign a company/expert to a client-posted task
 */
export const assignCompanyToClientTask = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { assigned_to_user_id } = req.body;

    if (!assigned_to_user_id) {
      return res.status(400).json({ success: false, message: 'assigned_to_user_id is required' });
    }

    // Check if the user exists and is a verified company
    const userCheck = await pool.query(
      `SELECT id, name, role FROM users WHERE id = $1 AND kyc_status = 'verified' AND role IN ('expert', 'company')`,
      [assigned_to_user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Company/Expert not found or not verified' });
    }

    const assignedUser = userCheck.rows[0];

    // Check if project exists and is client-posted
    const projectCheck = await pool.query(
      `SELECT id, posted_by_client, client_posting_status, company_id, expert_id
       FROM projects WHERE id = $1 AND posted_by_client IS NOT NULL`,
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client-posted task not found' });
    }

    const project = projectCheck.rows[0];

    // Update the project with the assigned company (use company_id field)
    const updateResult = await pool.query(
      `UPDATE projects 
       SET company_id = $1, status = 'assigned', updated_at = NOW() 
       WHERE id = $2
       RETURNING id, title, company_id, status, client_posting_status`,
      [assigned_to_user_id, project_id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to assign task' });
    }

    res.json({
      success: true,
      message: `Task assigned to ${assignedUser.name}`,
      project: updateResult.rows[0],
      assigned_to: assignedUser
    });

  } catch (error) {
    console.error('[ERROR] assignCompanyToClientTask failed:', error.message);
    next(error);
  }
};