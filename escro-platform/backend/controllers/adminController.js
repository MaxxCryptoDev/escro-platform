import pool from '../config/database.js';
import trustProfileHooks from '../services/trustProfileHooks.js';
import trustProfileService from '../services/trustProfileService.js';
import { sendEmailIfEnabled } from '../services/emailService.js';
import { logAdminAction, getAdminAuditLog } from '../services/adminAuditService.js';
import { invalidateUserStatusCache } from '../middleware/auth.js';
import { finalizeProject } from '../utils/finalizeProject.js';
import { isAssignable, canUnassign, isAdminEditable } from '../utils/projectStatus.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const includeDeleted = req.query.include_deleted === 'true';
    const result = await pool.query(
      `SELECT id, name, email, phone, company, portfolio_description, role, kyc_status, verification_date, created_at, profile_image_url, expertise, bio, industry, experience, deleted_at
       FROM users
       WHERE role != 'admin'
         ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
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

export const restoreUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      `UPDATE users SET deleted_at = NULL, kyc_status = 'pending' WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id, email, name`,
      [user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found or not deleted' });
    }
    invalidateUserStatusCache(user_id);
    await logAdminAction(req, 'user_restore', 'user', user_id);
    res.json({ success: true, message: 'User restaurat.', user: result.rows[0] });
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

    if (kyc_status === 'verified') {
      sendEmailIfEnabled(pool, id, 'userApproved', {}).catch(e => console.error('[background]', e.message));
    } else {
      sendEmailIfEnabled(pool, id, 'userRejected', {}).catch(e => console.error('[background]', e.message));
    }

    // Invalidate cached status so rejected user loses access on next request
    invalidateUserStatusCache(id);

    await logAdminAction(req, kyc_status === 'verified' ? 'kyc_verify' : 'kyc_reject', 'user', id, { kyc_status });

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



// resolveMilestoneDispute removed — superseded by resolveAdminDispute (line ~1610) which has FOR UPDATE,
// fund validation, atomic transaction, and audit logging. Don't add a route to this name.

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [projectsRes, expertsRes, disputesRes, revenueRes, usersRes, pendingRes, escrowRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM projects'),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'expert' AND kyc_status = 'verified'`),
      pool.query(`SELECT COUNT(*) FROM milestone_disputes WHERE status = 'pending'`),
      pool.query(`SELECT COALESCE(SUM(claudiu_earned_total_ron), 0) AS total FROM escrow_accounts`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role IN ('expert','company')`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role IN ('expert','company') AND (kyc_status IS NULL OR kyc_status = 'pending')`),
      pool.query(`SELECT COALESCE(SUM(held_balance_ron), 0) AS held FROM escrow_accounts`),
    ]);

    res.json({
      success: true,
      stats: {
        total_projects: parseInt(projectsRes.rows[0].count),
        verified_experts: parseInt(expertsRes.rows[0].count),
        pending_disputes: parseInt(disputesRes.rows[0].count),
        total_revenue: parseFloat(revenueRes.rows[0].total),
        total_users: parseInt(usersRes.rows[0].count),
        pending_kyc: parseInt(pendingRes.rows[0].count),
        escrow_held: parseFloat(escrowRes.rows[0].held),
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

      // Admin approval: marks the account as approved by admin (verification_date stamped).
      // For ALL roles, kyc_status remains 'pending' here — it flips to 'verified' only when:
      //  - individual: the identity call is marked completed in verification_calls
      //  - expert/company: Stripe Connect onboarding completes (webhook)
      const userResult = await client.query(
        `UPDATE users SET verification_date = NOW() WHERE id = $1 RETURNING id, email, name, role`,
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
        if (!profile.is_known_directly_by_admin) {
          await client.query(
            `UPDATE trust_profiles SET is_known_directly_by_admin = TRUE, updated_at = NOW() WHERE user_id = $1`,
            [user_id]
          );
        }
      }

      await client.query('COMMIT');

      // Award kyc_verified type2 points (5 pts) and recalculate trust level outside transaction
      try {
        await trustProfileService.awardType2Points(user_id, 'kyc_verified');
        await trustProfileService.recalculateTrustProfile(user_id, null, 'kyc_approved');
      } catch (tpErr) {
        console.error('[APPROVE] Trust recalc error (non-fatal):', tpErr.message);
      }

      // Notify user
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, created_at)
         VALUES ($1, 'account_approved', 'Cont aprobat', 'Contul tău a fost aprobat de admin. Poți folosi platforma complet.', NOW())`,
        [user_id]
      ).catch(e => console.error('[background]', e.message));
      sendEmailIfEnabled(pool, user_id, 'userApproved', {}).catch(e => console.error('[background]', e.message));

      await logAdminAction(req, 'user_approve', 'user', user_id);

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
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE users SET kyc_status = 'rejected', verification_date = NOW() WHERE id = $1 RETURNING id, email, name, role, kyc_status`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'account_rejected', 'Cont respins', $2, NOW())`,
      [user_id, `Contul tău a fost respins de admin.${reason ? ' Motiv: ' + reason : ' Contactează-ne pentru detalii.'}`]
    ).catch(e => console.error('[background]', e.message));
    sendEmailIfEnabled(pool, user_id, 'userRejected', { reason }).catch(e => console.error('[background]', e.message));

    // If admin rejected with suspension intent, kick existing sessions
    invalidateUserStatusCache(user_id);

    await logAdminAction(req, 'user_reject', 'user', user_id, { reason });

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
  try {
    const { user_id } = req.params;

    // Block soft-delete if user has active escrow funds (avoid orphan treasury)
    const escrowCheck = await pool.query(
      `SELECT 1 FROM escrow_accounts ea
       JOIN projects p ON ea.project_id = p.id
       WHERE (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)
         AND COALESCE(ea.held_balance_ron, 0) > 0
       LIMIT 1`,
      [user_id]
    );
    if (escrowCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Utilizatorul are fonduri active în escrow. Procesează refund-urile sau finalizează proiectele înainte.'
      });
    }

    // Block soft-delete if user has pending/approved payout requests — they're entitled to money.
    const payoutCheck = await pool.query(
      `SELECT 1 FROM payout_requests
       WHERE user_id = $1 AND status IN ('pending', 'approved')
       LIMIT 1`,
      [user_id]
    );
    if (payoutCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Utilizatorul are cereri de payout pending sau aprobate. Finalizează-le sau respinge-le înainte de ștergere.'
      });
    }

    const result = await pool.query(
      `UPDATE users SET deleted_at = NOW(), kyc_status = 'suspended' WHERE id = $1 AND deleted_at IS NULL RETURNING id, email, name`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found or already deleted' });
    }

    // Invalidate cached status so existing tokens lose access on next request
    invalidateUserStatusCache(user_id);

    await logAdminAction(req, 'user_delete', 'user', user_id);

    res.json({
      success: true,
      message: 'User dezactivat (soft delete). Datele sunt păstrate.',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProjects = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status || null;
    const search = (req.query.q || '').trim();

    // Helper: build filter SQL fragment + params starting from a given index
    const buildFilters = (startIdx) => {
      const parts = [];
      const params = [];
      let idx = startIdx;
      if (statusFilter) { params.push(statusFilter); parts.push(`status = $${idx++}`); }
      if (search) { params.push(`%${search}%`); parts.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); idx++; }
      return { sql: parts.length ? parts.join(' AND ') : '', params };
    };

    // Count: two separate subqueries, each with its own filters
    const projF = buildFilters(1);
    const taskF = buildFilters(projF.params.length + 1);
    const countRes = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL ${projF.sql ? `AND ${projF.sql}` : ''}) +
         (SELECT COUNT(*) FROM tasks ${taskF.sql ? `WHERE ${taskF.sql}` : ''})
         AS total`,
      [...projF.params, ...taskF.params]
    );
    const total = parseInt(countRes.rows[0]?.total) || 0;

    // Data: same pattern, shared parameter list with positional offsets
    const projF2 = buildFilters(1);
    const taskF2 = buildFilters(projF2.params.length + 1);
    const limitIdx = projF2.params.length + taskF2.params.length + 1;
    const offsetIdx = limitIdx + 1;
    const projectsResult = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.company_id, p.task_id, p.assignment_type,
              p.service_type, p.title, p.description, p.budget_ron, p.timeline_days, p.status,
              p.created_at, p.updated_at, p.posted_by_expert, p.posted_by_client,
              p.expert_posting_status, p.client_posting_status,
              p.commission_percent,
              u.name as client_name,
              e.name as expert_name, e.profile_image_url as expert_profile_image_url,
              c.name as company_name, c.profile_image_url as company_profile_image_url
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       WHERE p.deleted_at IS NULL ${projF2.sql ? `AND ${projF2.sql}` : ''}

       UNION ALL

       SELECT t.id, t.client_id,
              NULL::uuid as expert_id, NULL::uuid as company_id,
              t.id as task_id, 'pm_task'::varchar as assignment_type,
              'project_management'::varchar as service_type,
              t.title, t.description, t.budget_ron, t.timeline_days,
              t.status, t.created_at, t.updated_at,
              NULL::uuid as posted_by_expert, NULL::uuid as posted_by_client,
              NULL::varchar as expert_posting_status, NULL::varchar as client_posting_status,
              NULL::numeric as commission_percent,
              u.name as client_name,
              NULL::text as expert_name, NULL::text as expert_profile_image_url,
              NULL::text as company_name, NULL::text as company_profile_image_url
       FROM tasks t
       LEFT JOIN users u ON t.client_id = u.id
       ${taskF2.sql ? `WHERE ${taskF2.sql}` : ''}

       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...projF2.params, ...taskF2.params, limit, offset]
    );

    res.json({
      success: true,
      projects: projectsResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
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
        `SELECT id, status, title FROM tasks WHERE id = $1`,
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

      await logAdminAction(req, 'pm_task_approve', 'task', project_id, {
        title: taskResult.rows[0].title,
        previous_status: taskResult.rows[0].status
      });

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

    // PM sub-assignments (have task_id) → pending_assignment (waiting for prestator).
    // Standalone matching/direct → open. PM container → in_progress.
    const newStatus = currentServiceType === 'project_management'
      ? 'in_progress'
      : (project.task_id ? 'pending_assignment' : 'open');
    
    // Update project status
    const updateResult = await pool.query(
      `UPDATE projects SET status = $1, commission_percent = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [newStatus, safeCommissionPercent, project_id]
    );

    const statusMessage = currentServiceType === 'project_management' ? 'Project Management task is now in progress' : 'Project approved and is now visible to experts';

    const updatedProj = updateResult.rows[0];
    const ownerId = updatedProj.client_id || updatedProj.expert_id || updatedProj.company_id;
    if (ownerId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_approved', 'Proiect aprobat', $2, $3, NOW())`,
        [ownerId, `Proiectul tău "${updatedProj.title}" a fost aprobat și este acum activ.`, `/project/${project_id}`]
      ).catch(e => console.error('[background]', e.message));
      sendEmailIfEnabled(pool, ownerId, 'projectApproved', {
        projectTitle: updatedProj.title,
        projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
      }).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'project_approve', 'project', project_id, { title: updatedProj.title });

    res.json({
      success: true,
      message: statusMessage,
      project: updatedProj
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
      `SELECT id, status, client_id, expert_id, company_id, title FROM projects WHERE id = $1`,
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

    const ownerId = project.client_id || project.expert_id || project.company_id;
    if (ownerId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_rejected', 'Proiect respins', $2, $3, NOW())`,
        [ownerId, `Proiectul "${project.title}" a fost respins de admin.${reason ? ' Motiv: ' + reason : ''}`, `/project/${project_id}`]
      ).catch(e => console.error('[background]', e.message));
      sendEmailIfEnabled(pool, ownerId, 'projectRejected', {
        projectTitle: project.title,
        reason: reason || null,
      }).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'project_reject', 'project', project_id, { title: project.title, reason });

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

    // Block deletion if escrow still holds funds — admin must refund first
    const escrowCheck = await pool.query(
      `SELECT held_balance_ron FROM escrow_accounts
       WHERE project_id = $1 AND COALESCE(held_balance_ron, 0) > 0`,
      [project_id]
    );
    if (escrowCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Proiectul are ${escrowCheck.rows[0].held_balance_ron} RON activi în escrow. Procesează refund-ul înainte de ștergere.`
      });
    }

    const result = await pool.query(
      `UPDATE projects SET deleted_at = NOW(), status = 'rejected' WHERE id = $1 AND deleted_at IS NULL RETURNING id, title`,
      [project_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found or already deleted' });
    }

    await logAdminAction(req, 'project_delete', 'project', project_id, { title: result.rows[0].title });

    res.json({
      success: true,
      message: 'Proiect arhivat (soft delete). Datele sunt păstrate.',
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
      `SELECT id, role, name, kyc_status, deleted_at FROM users WHERE id = $1`,
      [expert_id]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].deleted_at) {
      return res.status(400).json({ success: false, message: 'Utilizator inexistent sau dezactivat.' });
    }
    if (userCheck.rows[0].kyc_status !== 'verified') {
      return res.status(400).json({ success: false, message: 'Doar utilizatorii verificați KYC pot fi asignați.' });
    }

    // Anti self-dealing + status precondition
    const projCheck = await pool.query(`SELECT client_id, status FROM projects WHERE id = $1`, [project_id]);
    if (projCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proiect inexistent.' });
    }
    if (String(projCheck.rows[0].client_id) === String(expert_id)) {
      return res.status(400).json({ success: false, message: 'Clientul nu poate fi asignat ca prestator propriu.' });
    }
    if (!isAssignable(projCheck.rows[0].status)) {
      return res.status(409).json({
        success: false,
        message: `Nu poți asigna pe un proiect în status '${projCheck.rows[0].status}'.`
      });
    }

    const userRole = userCheck.rows[0].role;
    const userName = userCheck.rows[0].name;

    // Set assignee and put project in 'pending_expert_approval' — the prestator must accept
    // before work starts. This gives expert/company a chance to refuse, consistent with PM flow.
    let updateQuery;
    if (userRole === 'expert') {
      updateQuery = `UPDATE projects SET expert_id = $1, status = 'pending_expert_approval' WHERE id = $2`;
    } else {
      updateQuery = `UPDATE projects SET company_id = $1, status = 'pending_expert_approval' WHERE id = $2`;
    }

    await pool.query(updateQuery, [expert_id, project_id]);

    // If this is a task_assignment (collaboration), also update the PM parent task to in_progress
    const projectCheck = await pool.query(
      `SELECT task_id FROM projects WHERE id = $1`,
      [project_id]
    );
    
    // Don't mark parent task in_progress yet — wait until expert accepts assignment.
    // (parent transition happens in expertAcceptAssignment / projectManagementController accept).

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
    const notifType = userRole === 'expert' ? 'expert_assigned' : 'company_assigned';
    const proj = result.rows[0];

    // Notify the assigned expert/company
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, $2, 'Asignat la proiect', $3, $4, NOW())`,
      [expert_id, notifType, `Ai fost asignat la proiectul "${proj.title}". Verifică detaliile și semnează contractul.`, `/project/${project_id}`]
    ).catch(e => console.error('[background]', e.message));

    // Notify client that a provider was assigned
    if (proj.client_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, $2, 'Prestator asignat', $3, $4, NOW())`,
        [proj.client_id, notifType, `Un ${assignedType.toLowerCase()} a fost asignat la proiectul tău "${proj.title}".`, `/project/${project_id}`]
      ).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'project_assign', 'project', project_id, {
      assigned_to: expert_id,
      role: userRole,
      type: assignedType
    });

    res.json({
      success: true,
      message: `${assignedType} ${userName} assigned to project and status updated`,
      project: proj
    });
  } catch (error) {
    console.error('assignExpertToProject error:', error);
    next(error);
  }
};

export const assignToProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { expert_id, company_id } = req.body;

    if (!expert_id && !company_id) {
      return res.status(400).json({ success: false, message: 'expert_id sau company_id sunt necesare' });
    }

    const projectCheck = await pool.query(`SELECT id, status, client_id FROM projects WHERE id = $1`, [project_id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proiect negăsit' });
    }
    const proj = projectCheck.rows[0];

    // Status precondition: don't reassign on terminal states
    if (!isAssignable(proj.status)) {
      return res.status(409).json({
        success: false,
        message: `Nu poți asigna pe un proiect în status '${proj.status}'.`
      });
    }

    // Anti self-dealing: prestator can't be the same as client
    const proposedPrestator = expert_id || company_id;
    if (String(proposedPrestator) === String(proj.client_id)) {
      return res.status(400).json({ success: false, message: 'Clientul nu poate fi asignat ca prestator propriu.' });
    }

    // Verify prestator is admin-approved + not deleted
    // Admin approval (verification_date set, not rejected) is sufficient to assign.
    // Stripe KYC is required only when money actually moves (gate inside transfer flow).
    if (proposedPrestator) {
      const userCheck = await pool.query(
        `SELECT id, role, kyc_status, verification_date, deleted_at FROM users WHERE id = $1`,
        [proposedPrestator]
      );
      if (userCheck.rows.length === 0 || userCheck.rows[0].deleted_at) {
        return res.status(400).json({ success: false, message: 'Utilizator inexistent sau dezactivat.' });
      }
      const u = userCheck.rows[0];
      if (!u.verification_date || u.kyc_status === 'rejected') {
        return res.status(400).json({ success: false, message: 'Utilizatorul trebuie aprobat de admin (verification call) înainte de asignare.' });
      }
      // Verify role matches column (expert_id → role=expert, company_id → role=company)
      if (expert_id && userCheck.rows[0].role !== 'expert') {
        return res.status(400).json({ success: false, message: 'expert_id trebuie să fie un user cu rol expert.' });
      }
      if (company_id && userCheck.rows[0].role !== 'company') {
        return res.status(400).json({ success: false, message: 'company_id trebuie să fie un user cu rol company.' });
      }
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (expert_id !== undefined) {
      updates.push(`expert_id = $${idx++}`);
      values.push(expert_id || null);
    }
    if (company_id !== undefined) {
      updates.push(`company_id = $${idx++}`);
      values.push(company_id || null);
    }
    updates.push(`status = $${idx++}`);
    values.push('in_progress');
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(project_id);

    await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    const result = await pool.query(
      `SELECT p.*, u.name as client_name, e.name as expert_name, c.name as company_name
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       WHERE p.id = $1`,
      [project_id]
    );

    // Notify the assigned user(s)
    const proj2 = result.rows[0];
    if (expert_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'expert_assigned', 'Asignat la proiect', $2, $3, NOW())`,
        [expert_id, `Ai fost asignat la proiectul "${proj2.title}". Verifică detaliile și semnează contractul.`, `/project/${project_id}`]
      ).catch(e => console.error('[background]', e.message));
    }
    if (company_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'company_assigned', 'Asignat la proiect', $2, $3, NOW())`,
        [company_id, `Ai fost asignat la proiectul "${proj2.title}". Verifică detaliile și semnează contractul.`, `/project/${project_id}`]
      ).catch(e => console.error('[background]', e.message));
    }
    if (proj2.client_id && (expert_id || company_id)) {
      const assignedLabel = expert_id ? 'expert' : 'companie';
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, $2, 'Prestator asignat', $3, $4, NOW())`,
        [proj2.client_id, expert_id ? 'expert_assigned' : 'company_assigned',
         `Un ${assignedLabel} a fost asignat la proiectul tău "${proj2.title}".`, `/project/${project_id}`]
      ).catch(e => console.error('[background]', e.message));
    }

    // Auto-create the project contract so both parties immediately have something to sign.
    // Fire-and-forget: if it fails (e.g., no milestones yet), the manual button on ProjectDetail still works.
    setImmediate(async () => {
      try {
        const { createProjectContractInternal } = await import('./contractController.js');
        const result = await createProjectContractInternal(project_id);
        if (result.skipped) {
          console.log('[auto-contract on assign] skipped:', result.reason);
        }
      } catch (e) {
        console.warn('[auto-contract on assign]', e.message);
      }
    });

    await logAdminAction(req, 'project_assign', 'project', project_id, {
      expert_id: expert_id || null,
      company_id: company_id || null,
    });

    res.json({ success: true, project: proj2 });
  } catch (error) {
    console.error('assignToProject error:', error);
    next(error);
  }
};

export const createTaskForClient = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { task_id } = req.params;
    const { title, description, budget_ron, timeline_days, service_type, expert_id, company_id, milestones } = req.body;

    const taskCheck = await client.query(`SELECT id, client_id, budget_ron, timeline_days FROM tasks WHERE id = $1`, [task_id]);
    if (taskCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Task negăsit' });
    }
    const task = taskCheck.rows[0];

    if (!title || !description) {
      client.release();
      return res.status(400).json({ error: 'Titlul și descrierea sunt obligatorii' });
    }

    const safeServiceType = ['direct', 'matching'].includes(service_type) ? service_type : 'matching';
    const effectiveBudget = parseFloat(budget_ron) || parseFloat(task.budget_ron) || 0;

    await client.query('BEGIN');

    const projectResult = await client.query(
      `INSERT INTO projects (client_id, expert_id, company_id, task_id, title, description, budget_ron, timeline_days,
                             status, service_type, assignment_type, created_by_admin, created_at, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_client_approval', $9, 'task_assignment', true, NOW(),
               NOW() + make_interval(days => $8::int))
       RETURNING *`,
      [
        task.client_id,
        expert_id || null,
        company_id || null,
        task_id,
        title,
        description,
        effectiveBudget,
        timeline_days || task.timeline_days,
        safeServiceType
      ]
    );

    const project_id = projectResult.rows[0].id;

    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        const pct = parseFloat(m.percentage_of_budget) || 0;
        await client.query(
          `INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
          [project_id, i + 1, m.title, m.title, m.deliverable_description || '', pct,
           Math.round(effectiveBudget * pct / 100 * 100) / 100]
        );
      }
    }

    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'task_approval_required', $2, $3, $4, NOW())`,
      [
        task.client_id,
        'Task nou de aprobat',
        `Adminul a creat taskul "${title}" în proiectul tău. Verifică și aprobă pentru a continua.`,
        `/project/${task_id}/assignment/${project_id}`
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({ success: true, assignment: projectResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('[background]', e.message));
    console.error('createTaskForClient error:', error);
    next(error);
  } finally {
    client.release();
  }
};

export const removeExpertFromProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    // Status precondition + escrow + contract checks
    const projCheck = await pool.query(`SELECT status FROM projects WHERE id = $1`, [project_id]);
    if (projCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (!canUnassign(projCheck.rows[0].status)) {
      return res.status(409).json({
        success: false,
        message: `Nu poți dezasigna pe un proiect în status '${projCheck.rows[0].status}'.`
      });
    }

    // Block if escrow has funds — admin must refund first
    const escrowCheck = await pool.query(
      `SELECT held_balance_ron FROM escrow_accounts WHERE project_id = $1 AND COALESCE(held_balance_ron, 0) > 0`,
      [project_id]
    );
    if (escrowCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Escrow are ${escrowCheck.rows[0].held_balance_ron} RON. Procesează refund înainte de dezasignare.`
      });
    }

    // Block if project contract already accepted (both parties signed)
    const contractCheck = await pool.query(
      `SELECT 1 FROM contracts
       WHERE project_id = $1 AND contract_type = 'project'
         AND party1_accepted = TRUE AND party2_accepted = TRUE
       LIMIT 1`,
      [project_id]
    );
    if (contractCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Contractul de proiect e deja semnat de ambele părți. Anulează proiectul în loc de dezasignare.'
      });
    }

    // Reset both expert_id and company_id (prestator slot is one-of)
    const result = await pool.query(
      `UPDATE projects
       SET expert_id = NULL, company_id = NULL, status = 'pending_assignment'
       WHERE id = $1 RETURNING *`,
      [project_id]
    );

    await logAdminAction(req, 'task_unassign', 'project', project_id);

    res.json({
      success: true,
      message: 'Expert/Company removed from project',
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
      const adminUser = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
      const adminId = adminUser.rows[0]?.id;
      if (!adminId) throw new Error('No admin user found to create test project');
      projectResult = await pool.query(
        `INSERT INTO projects (title, description, budget_ron, timeline_days, status, client_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, budget_ron`,
        ['bla bla', 'Test project', 5000, 30, 'open', adminId]
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

    // First, get the task request to get user_id and project_id
    const taskRequestResult = await pool.query(
      `SELECT * FROM task_requests WHERE id = $1`,
      [request_id]
    );

    if (taskRequestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task request not found' });
    }

    const taskRequest = taskRequestResult.rows[0];

    // Block if project already has a prestator assigned
    const existingAssignment = await pool.query(
      `SELECT expert_id, company_id, status FROM projects WHERE id = $1`,
      [taskRequest.project_id]
    );
    if (existingAssignment.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (existingAssignment.rows[0].expert_id || existingAssignment.rows[0].company_id) {
      return res.status(409).json({
        success: false,
        message: 'Proiectul are deja un prestator asignat. Dezasignează-l înainte de a aproba alt request.'
      });
    }

    // Update task request status
    const result = await pool.query(
      `UPDATE task_requests SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [request_id]
    );

    // Determine the correct column based on applicant role
    const userRoleRes = await pool.query(`SELECT role FROM users WHERE id = $1`, [taskRequest.user_id]);
    const applicantRole = userRoleRes.rows[0]?.role;
    let updateResult;
    if (applicantRole === 'expert') {
      updateResult = await pool.query(
        `UPDATE projects SET expert_id = $1, status = 'assigned', updated_at = NOW() WHERE id = $2 RETURNING id, title, client_id`,
        [taskRequest.user_id, taskRequest.project_id]
      );
    } else if (applicantRole === 'company') {
      updateResult = await pool.query(
        `UPDATE projects SET company_id = $1, status = 'assigned', updated_at = NOW() WHERE id = $2 RETURNING id, title, client_id`,
        [taskRequest.user_id, taskRequest.project_id]
      );
    } else {
      return res.status(400).json({ success: false, error: `Cannot assign user with role '${applicantRole}'` });
    }


    // Notify the expert who applied
    if (taskRequest.user_id) {
      const proj = updateResult.rows[0];
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_accepted', 'Candidatură acceptată', $2, $3, NOW())`,
        [taskRequest.user_id, `Candidatura ta la "${proj?.title || 'proiect'}" a fost acceptată. Poți începe lucrul.`, `/project/${taskRequest.project_id}`]
      ).catch(e => console.error('[background]', e.message));
      // Notify client too
      if (proj?.client_id) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, link, created_at)
           VALUES ($1, 'project_approved', 'Expert asignat', $2, $3, NOW())`,
          [proj.client_id, `Un expert a fost asignat la proiectul "${proj.title}".`, `/project/${taskRequest.project_id}`]
        ).catch(e => console.error('[background]', e.message));
      }
    }

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

    const result = await pool.query(
      `UPDATE task_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [request_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task request not found' });
    }


    const rejected = result.rows[0];
    if (rejected.user_id) {
      const projRes = await pool.query('SELECT title FROM projects WHERE id = $1', [rejected.project_id]);
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_rejected_by_expert', 'Candidatură respinsă', $2, $3, NOW())`,
        [rejected.user_id, `Candidatura ta la "${projRes.rows[0]?.title || 'proiect'}" nu a fost acceptată.`, `/project/${rejected.project_id}`]
      ).catch(e => console.error('[background]', e.message));
    }

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

    // Idempotency: only approve if currently pending
    const result = await pool.query(
      `UPDATE projects
       SET expert_posting_status = 'approved', status = 'open', updated_at = NOW()
       WHERE id = $1 AND posted_by_expert IS NOT NULL AND expert_posting_status = 'pending'
       RETURNING id, title, expert_posting_status, status, posted_by_expert`,
      [project_id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Task negăsit sau deja procesat.' });
    }

    const expertId = result.rows[0].posted_by_expert;
    if (expertId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_approved', 'Task aprobat', $2, $3, NOW())`,
        [expertId, `Task-ul tău "${result.rows[0].title}" a fost aprobat și este acum vizibil pentru companii.`, `/project/${result.rows[0].id}`]
      ).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'expert_posted_task_approve', 'project', project_id, { title: result.rows[0].title });

    res.json({
      success: true,
      message: 'Expert-posted task approved! Companies can now see it.',
      data: result.rows[0]
    });
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

    // Idempotency: only reject if currently pending
    const result = await pool.query(
      `UPDATE projects
       SET expert_posting_status = 'rejected', status = 'rejected', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1 AND posted_by_expert IS NOT NULL AND expert_posting_status = 'pending'
       RETURNING id, title, expert_posting_status, status, posted_by_expert`,
      [project_id, reason || null]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Task negăsit sau deja procesat.' });
    }

    const expertId = result.rows[0].posted_by_expert;
    if (expertId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_rejected', 'Task respins', $2, $3, NOW())`,
        [expertId, `Task-ul tău "${result.rows[0].title}" a fost respins de admin.${reason ? ' Motiv: ' + reason : ''}`, `/project/${result.rows[0].id}`]
      ).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'expert_posted_task_reject', 'project', project_id, { title: result.rows[0].title, reason });

    res.json({
      success: true,
      message: 'Expert-posted task rejected.',
      data: result.rows[0]
    });
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

    const result = await pool.query(
      `UPDATE projects
       SET client_posting_status = 'approved', status = 'open', updated_at = NOW()
       WHERE id = $1 AND posted_by_client IS NOT NULL AND client_posting_status = 'pending'
       RETURNING id, title, client_posting_status, status, posted_by_client`,
      [project_id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Task negăsit sau deja procesat.' });
    }

    const clientId = result.rows[0].posted_by_client;
    if (clientId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_approved', 'Task aprobat', $2, $3, NOW())`,
        [clientId, `Task-ul tău "${result.rows[0].title}" a fost aprobat și este acum vizibil pentru experți.`, `/project/${result.rows[0].id}`]
      ).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'client_posted_task_approve', 'project', project_id, { title: result.rows[0].title });

    res.json({
      success: true,
      message: 'Client-posted task approved! Experts can now see it.',
      data: result.rows[0]
    });
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

    const result = await pool.query(
      `UPDATE projects
       SET client_posting_status = 'rejected', status = 'rejected', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1 AND posted_by_client IS NOT NULL AND client_posting_status = 'pending'
       RETURNING id, title, client_posting_status, status, posted_by_client`,
      [project_id, reason || null]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Task negăsit sau deja procesat.' });
    }

    const clientId = result.rows[0].posted_by_client;
    if (clientId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_rejected', 'Task respins', $2, $3, NOW())`,
        [clientId, `Task-ul tău "${result.rows[0].title}" a fost respins de admin.${reason ? ' Motiv: ' + reason : ''}`, `/project/${result.rows[0].id}`]
      ).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'client_posted_task_reject', 'project', project_id, { title: result.rows[0].title, reason });

    res.json({
      success: true,
      message: 'Client-posted task rejected.',
      data: result.rows[0]
    });
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
      `SELECT id, status, posted_by_client, client_posting_status, company_id, expert_id, client_id
       FROM projects WHERE id = $1 AND posted_by_client IS NOT NULL`,
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client-posted task not found' });
    }

    const project = projectCheck.rows[0];

    // Status precondition: don't reassign on terminal/active states
    if (!isAssignable(project.status)) {
      return res.status(409).json({
        success: false,
        message: `Nu poți asigna pe un task în status '${project.status}'.`
      });
    }

    // Anti self-dealing
    if (String(project.client_id) === String(assigned_to_user_id) || String(project.posted_by_client) === String(assigned_to_user_id)) {
      return res.status(400).json({ success: false, message: 'Clientul nu poate fi asignat ca prestator propriu.' });
    }

    // Set the correct column based on the assigned user's role (expert vs company)
    const targetColumn = assignedUser.role === 'expert' ? 'expert_id' : 'company_id';
    const otherColumn = assignedUser.role === 'expert' ? 'company_id' : 'expert_id';
    const updateResult = await pool.query(
      `UPDATE projects
       SET ${targetColumn} = $1, ${otherColumn} = NULL, status = 'assigned', updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, company_id, expert_id, status, client_posting_status`,
      [assigned_to_user_id, project_id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to assign task' });
    }

    await logAdminAction(req, 'task_assign', 'project', project_id, {
      assigned_to: assigned_to_user_id,
      role: assignedUser.role
    });

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

// ── Financiar ──────────────────────────────────────────────────────────────

export const getAdminFinanciar = async (req, res, next) => {
  try {
    const [summaryRes, releasesRes, escrowRes] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(claudiu_earned_total_ron), 0)    AS total_commission,
          COALESCE(SUM(released_to_expert_total_ron), 0) AS total_released_experts,
          COALESCE(SUM(total_amount_ron), 0)             AS total_escrow_ever,
          COALESCE(SUM(held_balance_ron), 0)             AS currently_held,
          COUNT(*)                                        AS escrow_count
        FROM escrow_accounts
      `),
      pool.query(`
        SELECT
          mr.id, mr.released_at,
          mr.release_amount_ron, mr.claudiu_commission_amount_ron, mr.expert_amount_ron,
          m.title AS milestone_title,
          p.title AS project_title, p.id AS project_id,
          u_expert.name AS expert_name,
          u_client.name AS client_name
        FROM milestone_releases mr
        JOIN milestones m ON mr.milestone_id = m.id
        JOIN escrow_accounts ea ON mr.escrow_id = ea.id
        JOIN projects p ON ea.project_id = p.id
        LEFT JOIN users u_expert ON p.expert_id = u_expert.id
        LEFT JOIN users u_client ON COALESCE(p.company_id, p.client_id) = u_client.id
        ORDER BY mr.released_at DESC
        LIMIT 100
      `),
      pool.query(`
        SELECT
          DATE_TRUNC('month', released_at) AS month,
          SUM(claudiu_commission_amount_ron) AS commission,
          SUM(expert_amount_ron) AS expert_paid,
          COUNT(*) AS releases
        FROM milestone_releases
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 12
      `)
    ]);

    res.json({
      success: true,
      summary: summaryRes.rows[0],
      releases: releasesRes.rows,
      monthly: escrowRes.rows
    });
  } catch (error) {
    next(error);
  }
};

// ── Contracte ─────────────────────────────────────────────────────────────

export const getAdminContracts = async (req, res, next) => {
  try {
    const [projectContracts, userContracts] = await Promise.all([
      pool.query(`
        SELECT
          c.id, c.contract_type, c.status, c.contract_number,
          c.pdf_url, c.created_at, c.party1_accepted, c.party2_accepted,
          c.party1_accepted_at, c.party2_accepted_at,
          p.title AS project_title, p.id AS project_id,
          u1.name AS party1_name, u1.company AS party1_company,
          u2.name AS party2_name, u2.company AS party2_company,
          m.title AS milestone_title
        FROM contracts c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN users u1 ON c.party1_id = u1.id
        LEFT JOIN users u2 ON c.party2_id = u2.id
        LEFT JOIN milestones m ON c.milestone_id = m.id
        ORDER BY c.created_at DESC
        LIMIT 200
      `),
      pool.query(`
        SELECT
          uc.id, uc.contract_type, uc.contract_pdf_url, uc.signed_at, uc.ip_address, uc.created_at,
          u.name AS user_name, u.email AS user_email, u.role AS user_role
        FROM user_contracts uc
        JOIN users u ON uc.user_id = u.id
        ORDER BY uc.created_at DESC
        LIMIT 200
      `)
    ]);

    res.json({
      success: true,
      projectContracts: projectContracts.rows,
      userContracts: userContracts.rows
    });
  } catch (error) {
    next(error);
  }
};

// ── Dispute ───────────────────────────────────────────────────────────────

export const getAdminDisputes = async (req, res, next) => {
  try {
    // Opt-in to see resolved disputes via ?include=resolved or ?include=all
    const include = (req.query.include || '').toLowerCase();
    const showAll = include === 'resolved' || include === 'all';
    const result = await pool.query(`
      SELECT
        md.id, md.status, md.reason, md.claudiu_decision, md.decision_type,
        md.claudiu_release_amount_ron, md.created_at, md.resolved_at,
        md.evidence_files,
        m.id AS milestone_id, m.title AS milestone_title, m.amount_ron AS milestone_amount,
        p.title AS project_title, p.id AS project_id,
        u.name AS raised_by_name, u.email AS raised_by_email
      FROM milestone_disputes md
      JOIN milestones m ON md.milestone_id = m.id
      JOIN projects p ON m.project_id = p.id
      JOIN users u ON md.raised_by = u.id
      ${showAll ? '' : "WHERE md.status != 'resolved'"}
      ORDER BY md.created_at DESC
    `);
    res.json({ success: true, disputes: result.rows });
  } catch (error) {
    next(error);
  }
};

export const resolveAdminDispute = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { dispute_id } = req.params;
    const { decision, release_amount, decision_type } = req.body;
    const releaseAmt = parseFloat(release_amount) || 0;

    // Validate decision_type vs release_amount coherence
    const validTypes = ['full', 'partial', 'rejected', 'refund'];
    if (decision_type && !validTypes.includes(decision_type)) {
      return res.status(400).json({ error: `decision_type invalid. Folosește: ${validTypes.join(', ')}` });
    }
    if ((decision_type === 'rejected' || decision_type === 'refund') && releaseAmt > 0) {
      return res.status(400).json({
        error: `Pentru decision_type='${decision_type}' suma eliberată trebuie să fie 0 (banii rămân la client).`
      });
    }
    if (decision_type === 'full' && releaseAmt === 0) {
      return res.status(400).json({
        error: 'Pentru decision_type=full trebuie să specifici suma eliberată > 0.'
      });
    }

    const dispRes = await client.query(
      `SELECT md.*, m.id AS milestone_id, m.amount_ron, m.title AS milestone_title,
              p.id AS project_id, p.title AS project_title, p.expert_id, p.company_id, p.client_id
       FROM milestone_disputes md
       JOIN milestones m ON md.milestone_id = m.id
       JOIN projects p ON m.project_id = p.id
       WHERE md.id = $1`, [dispute_id]
    );
    if (!dispRes.rows.length) return res.status(404).json({ error: 'Dispute not found' });
    const d = dispRes.rows[0];

    await client.query('BEGIN');

    // Idempotency: re-check dispute is still resolvable inside transaction
    const lockRes = await client.query(
      `SELECT status FROM milestone_disputes WHERE id = $1 FOR UPDATE`,
      [dispute_id]
    );
    if (!['pending', 'open'].includes(lockRes.rows[0]?.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Dispute already resolved' });
    }

    // Validate release amount doesn't exceed milestone amount
    const milestoneAmt = parseFloat(d.amount_ron) || 0;
    if (releaseAmt > milestoneAmt + 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Suma eliberată (${releaseAmt}) depășește valoarea milestone-ului (${milestoneAmt} RON).`
      });
    }

    await client.query(
      `UPDATE milestone_disputes
       SET claudiu_decision = $1, claudiu_release_amount_ron = $2, decision_type = $3,
           status = 'resolved', resolved_at = NOW()
       WHERE id = $4`,
      [decision, releaseAmt || null, decision_type || 'partial', dispute_id]
    );

    // Release escrow funds if amount specified
    if (releaseAmt > 0) {
      const escrowRes = await client.query(
        `SELECT e.*, e.claudiu_commission_percent FROM escrow_accounts e WHERE e.project_id = $1 FOR UPDATE`,
        [d.project_id]
      );
      if (escrowRes.rows.length > 0) {
        const escrow = escrowRes.rows[0];
        // Validate sufficient held balance
        const held = parseFloat(escrow.held_balance_ron) || 0;
        if (held < releaseAmt) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Fonduri insuficiente în escrow: ${held} RON disponibili, ${releaseAmt} RON solicitați.`
          });
        }
        const commission_pct = parseFloat(escrow.claudiu_commission_percent) || 10;
        const commission_amount = Math.round(releaseAmt * commission_pct / 100 * 100) / 100;
        const expert_amount = releaseAmt - commission_amount;

        await client.query(
          `INSERT INTO milestone_releases (escrow_id, milestone_id, release_amount_ron, claudiu_commission_amount_ron, expert_amount_ron, released_at, stripe_payout_status)
           VALUES ($1, $2, $3, $4, $5, NOW(), 'pending')`,
          [escrow.id, d.milestone_id, releaseAmt, commission_amount, expert_amount]
        );
        await client.query(
          `UPDATE escrow_accounts
           SET held_balance_ron = GREATEST(0, COALESCE(held_balance_ron,0) - $1),
               released_to_expert_total_ron = COALESCE(released_to_expert_total_ron,0) + $2,
               claudiu_earned_total_ron = COALESCE(claudiu_earned_total_ron,0) + $3
           WHERE id = $4`,
          [releaseAmt, expert_amount, commission_amount, escrow.id]
        );
        const prestatorId = d.expert_id || d.company_id;
        if (prestatorId && expert_amount > 0) {
          // Financial audit trail — must succeed or rollback the whole dispute resolution.
          await client.query(
            `INSERT INTO wallet_transactions (user_id, amount, type, description, project_id)
             VALUES ($1, $2, 'milestone_payment', $3, $4)`,
            [prestatorId, expert_amount, `Dispută rezolvată: "${d.milestone_title}"`, d.project_id]
          );
        }
      }
    }

    await client.query(
      `UPDATE milestones SET status = 'released' WHERE id = $1 AND status IN ('disputed','delivered')`,
      [d.milestone_id]
    );
    await client.query(
      `UPDATE projects SET status = 'assigned' WHERE id = $1 AND status = 'disputed'`,
      [d.project_id]
    );

    // If all milestones are now approved/released, auto-finalize project
    const pendingMs = await client.query(
      `SELECT COUNT(*) AS pending FROM milestones
       WHERE project_id = $1 AND status NOT IN ('approved', 'released')`,
      [d.project_id]
    );
    const shouldFinalize = parseInt(pendingMs.rows[0].pending) === 0;
    if (shouldFinalize) {
      // Check we haven't already finalized this project (idempotency)
      const wasAlreadyCompleted = await client.query(
        `SELECT status FROM projects WHERE id = $1`,
        [d.project_id]
      );
      const alreadyFinal = wasAlreadyCompleted.rows[0]?.status === 'completed';
      await client.query(
        `UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [d.project_id]
      );
      if (!alreadyFinal) {
        // Run side effects (counters, trust, contract, notifications) outside transaction
        // — committed after this block; fire-and-forget so dispute response isn't blocked
        setImmediate(() => {
          finalizeProject(d.project_id).catch(e =>
            console.warn('[resolveAdminDispute] finalize failed:', e.message)
          );
        });
      }
    }

    // Notify both parties
    for (const uid of [d.client_id, d.expert_id || d.company_id].filter(Boolean)) {
      const msg = `Disputa pentru milestone-ul "${d.milestone_title}" din proiectul "${d.project_title}" a fost rezolvată.${releaseAmt > 0 ? ` Sumă eliberată: ${releaseAmt} RON.` : ''}`;
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'dispute_resolved', 'Dispută rezolvată', $2, $3, NOW())`,
        [uid, msg, `/project/${d.project_id}`]
      ).catch(e => console.error('[background]', e.message));
    }

    await client.query('COMMIT');

    await logAdminAction(req, 'dispute_resolve', 'dispute', dispute_id, {
      release_amount: releaseAmt,
      decision_type: req.body?.decision_type || 'partial',
      milestone_id: d.milestone_id,
    });

    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('[background]', e.message));
    next(error);
  } finally {
    client.release();
  }
};

// ── Activity feed (admin sees all) ────────────────────────────────────────

export const getAdminActivity = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 25);
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT * FROM (
        SELECT 'milestone_delivered' AS event_type, m.title AS milestone_title,
          p.title AS project_title, p.id AS project_id,
          u.name AS actor_name, m.amount_ron AS amount, m.delivered_at AS event_time
        FROM milestones m JOIN projects p ON m.project_id = p.id
        JOIN users u ON COALESCE(p.expert_id, p.company_id) = u.id WHERE m.delivered_at IS NOT NULL

        UNION ALL

        SELECT 'milestone_approved', m.title, p.title, p.id,
          u.name, m.amount_ron, m.approved_at
        FROM milestones m JOIN projects p ON m.project_id = p.id
        JOIN users u ON p.client_id = u.id
        WHERE m.approved_at IS NOT NULL

        UNION ALL

        SELECT 'funds_released', m.title, p.title, p.id,
          u.name, mr.claudiu_commission_amount_ron, mr.released_at
        FROM milestone_releases mr
        JOIN escrow_accounts ea ON mr.escrow_id = ea.id
        JOIN projects p ON ea.project_id = p.id
        JOIN milestones m ON mr.milestone_id = m.id
        JOIN users u ON p.client_id = u.id

        UNION ALL

        SELECT 'escrow_deposit', NULL, p.title, p.id,
          u.name, ea.total_amount_ron, ea.created_at
        FROM escrow_accounts ea JOIN projects p ON ea.project_id = p.id
        JOIN users u ON p.client_id = u.id

        UNION ALL

        SELECT 'user_registered', NULL, NULL, NULL,
          u.name, NULL, u.created_at
        FROM users u WHERE u.role IN ('expert', 'company')
      ) events
      WHERE event_time IS NOT NULL
      ORDER BY event_time DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countRes = await pool.query(`
      SELECT COUNT(*) FROM (
        SELECT m.delivered_at AS event_time FROM milestones m WHERE m.delivered_at IS NOT NULL
        UNION ALL SELECT m.approved_at FROM milestones m WHERE m.approved_at IS NOT NULL
        UNION ALL SELECT mr.released_at FROM milestone_releases mr
        UNION ALL SELECT ea.created_at FROM escrow_accounts ea
        UNION ALL SELECT u.created_at FROM users u WHERE u.role IN ('expert','company')
      ) events WHERE event_time IS NOT NULL
    `);
    const total = parseInt(countRes.rows[0].count);

    res.json({ success: true, activity: result.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

export const adminEditProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { title, description, budget_ron, timeline_days, milestones } = req.body;

    // Get current project
    const projectRes = await pool.query(
      `SELECT id, title, description, budget_ron, timeline_days, status,
              posted_by_expert, posted_by_client, client_id
       FROM projects WHERE id = $1`,
      [project_id]
    );
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proiect negăsit' });
    }
    const project = projectRes.rows[0];

    // Only allow admin edit on projects awaiting approval — not on active/finalized projects
    if (!isAdminEditable(project.status)) {
      return res.status(409).json({
        success: false,
        message: `Nu poți edita un proiect în status '${project.status}'. Foloseste modificări (modifications) sau anulează proiectul.`
      });
    }

    // Block budget/milestone changes if escrow has funds held — would break consistency
    const budgetChanged = budget_ron != null && parseFloat(budget_ron) !== parseFloat(project.budget_ron);
    const milestonesChanged = milestones && Array.isArray(milestones) && milestones.length > 0;
    if (budgetChanged || milestonesChanged) {
      const escrowCheck = await pool.query(
        `SELECT 1 FROM escrow_accounts WHERE project_id = $1 AND COALESCE(held_balance_ron, 0) > 0 LIMIT 1`,
        [project_id]
      );
      if (escrowCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Nu poți schimba bugetul sau milestone-urile cât timp escrow-ul are fonduri active.'
        });
      }
    }

    // Determine new status
    const newStatus = project.status === 'pending_admin_approval'
      ? 'pending_client_approval'
      : project.status;

    // Wrap project + milestones updates in a single transaction
    const dbClient = await pool.connect();
    let updated;
    try {
      await dbClient.query('BEGIN');

      // Recalculate deadline if timeline_days changed (anchor on creation date)
      const newTimelineDays = timeline_days != null ? parseInt(timeline_days) : null;
      const timelineChanged = newTimelineDays !== null && newTimelineDays !== parseInt(project.timeline_days);

      const updRes = timelineChanged
        ? await dbClient.query(
            `UPDATE projects
             SET title = $1, description = $2, budget_ron = $3, timeline_days = $4,
                 status = $5, deadline = COALESCE(created_at, NOW()) + make_interval(days => $4::int),
                 updated_at = NOW()
             WHERE id = $6 RETURNING *`,
            [
              title ?? project.title,
              description ?? project.description,
              budget_ron ?? project.budget_ron,
              newTimelineDays,
              newStatus,
              project_id,
            ]
          )
        : await dbClient.query(
            `UPDATE projects
             SET title = $1, description = $2, budget_ron = $3, timeline_days = $4,
                 status = $5, updated_at = NOW()
             WHERE id = $6 RETURNING *`,
            [
              title ?? project.title,
              description ?? project.description,
              budget_ron ?? project.budget_ron,
              timeline_days ?? project.timeline_days,
              newStatus,
              project_id,
            ]
          );
      updated = updRes;

      if (milestones && Array.isArray(milestones)) {
        // Delete milestones that admin removed from the list — only those still 'pending'
        const keepIds = milestones.filter(m => m.id).map(m => m.id);
        if (keepIds.length > 0) {
          await dbClient.query(
            `DELETE FROM milestones WHERE project_id = $1 AND status = 'pending' AND id NOT IN (${keepIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [project_id, ...keepIds]
          );
        } else {
          // No milestones with IDs preserved — delete all pending ones (admin replacing them all)
          await dbClient.query(
            `DELETE FROM milestones WHERE project_id = $1 AND status = 'pending'`,
            [project_id]
          );
        }

        // Update existing / insert new
        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i];
          const pct = parseFloat(m.percentage_of_budget) || 0;
          const effectiveBudget = parseFloat(budget_ron ?? project.budget_ron) || 0;
          const amountRon = m.amount_ron ?? Math.round(effectiveBudget * pct / 100 * 100) / 100;

          if (m.id) {
            await dbClient.query(
              `UPDATE milestones
               SET title = $1, deliverable_description = $2, percentage_of_budget = $3, amount_ron = $4, order_number = $7
               WHERE id = $5 AND project_id = $6`,
              [m.title, m.deliverable_description || '', pct, amountRon, m.id, project_id, i + 1]
            );
          } else {
            await dbClient.query(
              `INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
               VALUES ($1, $2, $3, $3, $4, $5, $6, 'pending', NOW())`,
              [project_id, i + 1, m.title, m.deliverable_description || '', pct, amountRon]
            );
          }
        }
      }

      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      dbClient.release();
    }

    // Log change history per field for human-readable diff
    const fieldChanges = [];
    if (title != null && title !== project.title) fieldChanges.push({ field: 'title', old: project.title, new: title });
    if (description != null && description !== project.description) fieldChanges.push({ field: 'description', old: project.description, new: description });
    if (budget_ron != null && parseFloat(budget_ron) !== parseFloat(project.budget_ron)) fieldChanges.push({ field: 'budget_ron', old: String(project.budget_ron), new: String(budget_ron) });
    if (timeline_days != null && parseInt(timeline_days) !== parseInt(project.timeline_days)) fieldChanges.push({ field: 'timeline_days', old: String(project.timeline_days), new: String(timeline_days) });
    for (const ch of fieldChanges) {
      await pool.query(
        `INSERT INTO project_history (project_id, actor_id, action, field_name, old_value, new_value)
         VALUES ($1, $2, 'admin_edit', $3, $4, $5)`,
        [project_id, req.user.id, ch.field, ch.old, ch.new]
      ).catch(e => console.warn('[history]', e.message));
    }
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      await pool.query(
        `INSERT INTO project_history (project_id, actor_id, action, details)
         VALUES ($1, $2, 'admin_edit_milestones', $3)`,
        [project_id, req.user.id, JSON.stringify({ count: milestones.length })]
      ).catch(e => console.warn('[history]', e.message));
    }

    // Find owner to notify
    const ownerId = project.posted_by_expert || project.posted_by_client || project.client_id;
    if (ownerId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_approved', 'Task modificat de admin', $2, $3, NOW())`,
        [
          ownerId,
          `Admin a modificat taskul tău "${updated.rows[0].title}". Verifică și confirmă pentru a continua.`,
          `/project/${project_id}`
        ]
      ).catch(e => console.error('[background]', e.message));
    }

    await logAdminAction(req, 'project_edit', 'project', project_id, {
      changed_fields: fieldChanges.map(c => c.field),
      milestones_replaced: !!(milestones && milestones.length > 0),
    });

    res.json({ success: true, project: updated.rows[0] });
  } catch (error) {
    console.error('adminEditProject error:', error);
    next(error);
  }
};

/**
 * Bulk admin actions on users — approve/reject/suspend many at once.
 * Body: { action: 'approve'|'reject'|'suspend', user_ids: [uuid, ...], reason?: string }
 */
export const bulkUserAction = async (req, res, next) => {
  try {
    const { action, user_ids, reason } = req.body;
    if (!action || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'action și user_ids[] sunt obligatorii' });
    }
    if (user_ids.length > 100) {
      return res.status(400).json({ error: 'Maxim 100 utilizatori per operațiune.' });
    }
    const ALLOWED = ['approve', 'reject', 'suspend'];
    if (!ALLOWED.includes(action)) {
      return res.status(400).json({ error: `Acțiune invalidă. Alege din: ${ALLOWED.join(', ')}` });
    }

    // Safety: filter out admin role + self before applying
    const roleCheck = await pool.query(
      `SELECT id, role FROM users WHERE id = ANY($1::uuid[])`,
      [user_ids]
    );
    const safeTargets = roleCheck.rows
      .filter(u => u.role !== 'admin' && String(u.id) !== String(req.user.id))
      .map(u => u.id);
    const blockedTargets = roleCheck.rows
      .filter(u => u.role === 'admin' || String(u.id) === String(req.user.id))
      .map(u => u.id);

    const results = { success: [], failed: [], blocked: blockedTargets };

    for (const userId of safeTargets) {
      try {
        if (action === 'approve') {
          // Admin approval marks the account as verified by admin.
          // kyc_status remains Stripe-driven; do not set here.
          await pool.query(
            `UPDATE users SET verification_date = NOW()
             WHERE id = $1 AND deleted_at IS NULL`,
            [userId]
          );
        } else if (action === 'reject') {
          await pool.query(
            `UPDATE users SET kyc_status = 'rejected', verification_date = NOW() WHERE id = $1`,
            [userId]
          );
        } else if (action === 'suspend') {
          await pool.query(
            `UPDATE users SET kyc_status = 'suspended', deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            [userId]
          );
        }
        invalidateUserStatusCache(userId);
        results.success.push(userId);
      } catch (e) {
        results.failed.push({ id: userId, error: e.message });
      }
    }

    await logAdminAction(req, `bulk_${action}`, 'user', 'multiple', {
      total: user_ids.length,
      succeeded_ids: results.success,
      failed_ids: results.failed.map(f => f.id),
      blocked_ids: blockedTargets,
      reason,
    });

    res.json({ success: true, results });
  } catch (error) { next(error); }
};

// Project change history — visible to parties and admin
export const getProjectHistory = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Verify access
    const proj = await pool.query(
      `SELECT client_id, expert_id, company_id, posted_by_expert, posted_by_client
       FROM projects WHERE id = $1`,
      [project_id]
    );
    if (proj.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const p = proj.rows[0];
    const isParty = [p.client_id, p.expert_id, p.company_id, p.posted_by_expert, p.posted_by_client]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const r = await pool.query(
      `SELECT h.*, u.name AS actor_name, u.role AS actor_role
       FROM project_history h
       LEFT JOIN users u ON h.actor_id = u.id
       WHERE h.project_id = $1
       ORDER BY h.created_at DESC
       LIMIT 200`,
      [project_id]
    );
    res.json({ success: true, history: r.rows });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// FINANCIAR
// ─────────────────────────────────────────────

export const getAdminFinancialReport = async (req, res, next) => {
  try {
    // Overall escrow summary
    const summaryResult = await pool.query(`
      SELECT
        COALESCE(SUM(claudiu_earned_total_ron), 0)       AS total_commission,
        COALESCE(SUM(released_to_expert_total_ron), 0)   AS total_disbursed,
        COALESCE(SUM(held_balance_ron), 0)               AS currently_held,
        COALESCE(SUM(total_amount_ron), 0)               AS total_deposited
      FROM escrow_accounts
    `);

    // Payout requests summary
    const payoutSummaryResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')                AS pending_count,
        COALESCE(SUM(amount_ron) FILTER (WHERE status = 'pending'), 0)     AS pending_amount,
        COUNT(*) FILTER (WHERE status = 'processing')             AS processing_count,
        COALESCE(SUM(amount_ron) FILTER (WHERE status = 'processing'), 0)  AS processing_amount,
        COUNT(*) FILTER (WHERE status = 'paid')                   AS paid_count,
        COALESCE(SUM(amount_ron) FILTER (WHERE status = 'paid'), 0)        AS paid_amount
      FROM payout_requests
    `);

    // Commission per month — last 6 months
    const monthlyResult = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', mr.released_at), 'YYYY-MM') AS month,
        COALESCE(SUM(mr.claudiu_commission_amount_ron), 0)        AS commission,
        COALESCE(SUM(mr.expert_amount_ron), 0)                    AS disbursed,
        COUNT(*)                                                   AS release_count
      FROM milestone_releases mr
      WHERE mr.released_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', mr.released_at)
      ORDER BY DATE_TRUNC('month', mr.released_at) DESC
    `);

    // Recent milestone releases (last 20)
    const releasesResult = await pool.query(`
      SELECT
        mr.id,
        p.title AS project_title,
        m.title AS milestone_title,
        COALESCE(eu.name, cu.name) AS provider_name,
        cl.name AS client_name,
        mr.release_amount_ron,
        mr.claudiu_commission_amount_ron,
        mr.expert_amount_ron,
        mr.released_at,
        mr.stripe_payout_status
      FROM milestone_releases mr
      JOIN escrow_accounts ea ON mr.escrow_id = ea.id
      JOIN projects p ON ea.project_id = p.id
      LEFT JOIN milestones m ON mr.milestone_id = m.id
      LEFT JOIN users eu ON p.expert_id = eu.id
      LEFT JOIN users cu ON p.company_id = cu.id
      LEFT JOIN users cl ON p.client_id = cl.id
      ORDER BY mr.released_at DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      summary: summaryResult.rows[0],
      payout_summary: payoutSummaryResult.rows[0],
      monthly: monthlyResult.rows,
      recent_releases: releasesResult.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminPayoutRequests = async (req, res, next) => {
  try {
    const statusFilter = req.query.status;
    let whereClause = '';
    const params = [];

    if (statusFilter && ['pending', 'processing', 'paid', 'failed', 'cancelled'].includes(statusFilter)) {
      whereClause = 'WHERE pr.status = $1';
      params.push(statusFilter);
    }

    const result = await pool.query(
      `SELECT
         pr.*,
         u.name AS user_name,
         u.email AS user_email,
         u.role AS user_role,
         u.stripe_account_id,
         u.stripe_onboarding_complete
       FROM payout_requests pr
       JOIN users u ON pr.user_id = u.id
       ${whereClause}
       ORDER BY pr.requested_at DESC`,
      params
    );

    res.json({ success: true, payout_requests: result.rows });
  } catch (error) {
    next(error);
  }
};

export const approvePayoutRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    const result = await pool.query(
      `UPDATE payout_requests
       SET status = 'processing', processed_at = NOW(), admin_note = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [admin_note || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cererea nu a fost găsită sau nu este în așteptare.' });
    }

    const payout = result.rows[0];

    // Notify user
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'payout_processing', 'Retragere în procesare', $2, '/wallet/payouts', NOW())`,
      [payout.user_id, `Cererea de retragere de ${payout.amount_ron} RON este în procesare. Vei fi notificat când fondurile ajung în cont.`]
    ).catch(e => console.error('[background]', e.message));

    sendEmailIfEnabled(pool, payout.user_id, 'payoutApproved', { amountRon: payout.amount_ron }).catch(e => console.error('[background]', e.message));

    // Live Stripe transfer to user's Connect account. Best-effort: payout_requests stays
    // in 'processing' if transfer fails; admin can retry or mark paid manually.
    const isLiveStripe = !!process.env.STRIPE_SECRET_KEY
      && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_4eC39');
    if (isLiveStripe) {
      try {
        const userRes = await pool.query(
          `SELECT stripe_account_id, stripe_transfers_enabled FROM users WHERE id = $1`,
          [payout.user_id]
        );
        const u = userRes.rows[0];
        if (u?.stripe_account_id?.startsWith('acct_') && u.stripe_transfers_enabled) {
          const { default: stripe } = await import('../config/stripe.js');
          const transfer = await stripe.transfers.create({
            amount: Math.round(parseFloat(payout.amount_ron) * 100),
            currency: 'ron',
            destination: u.stripe_account_id,
            description: `ESCRO payout request #${id}`,
            metadata: { payout_request_id: id, user_id: payout.user_id },
          });
          await pool.query(
            `UPDATE payout_requests SET status = 'paid', paid_at = NOW(), stripe_transfer_id = $1 WHERE id = $2`,
            [transfer.id, id]
          ).catch(async () => {
            // stripe_transfer_id column may not exist on payout_requests — fallback without it
            await pool.query(
              `UPDATE payout_requests SET status = 'paid', paid_at = NOW() WHERE id = $1`,
              [id]
            );
          });
        } else {
          console.log('[stripe payout] user has no active Connect account; left in processing for manual handling');
        }
      } catch (transferErr) {
        console.warn('[stripe payout transfer failed]', transferErr.message);
      }
    }

    await logAdminAction(req, 'payout_approve', 'payout', id, { amount: payout.amount_ron, user_id: payout.user_id });

    res.json({
      success: true,
      payout_request: payout,
      message: 'Cererea a fost aprobată și este în procesare.'
    });
  } catch (error) {
    next(error);
  }
};

export const rejectPayoutRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    const result = await pool.query(
      `UPDATE payout_requests
       SET status = 'cancelled', processed_at = NOW(), admin_note = $1
       WHERE id = $2 AND status IN ('pending', 'processing')
       RETURNING *`,
      [admin_note || 'Respins de admin', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cererea nu a fost găsită sau nu poate fi respinsă.' });
    }

    const payout = result.rows[0];

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'payout_failed', 'Cerere retragere respinsă', $2, '/wallet/payouts', NOW())`,
      [payout.user_id, `Cererea de retragere de ${payout.amount_ron} RON a fost respinsă${admin_note ? ': ' + admin_note : '.'}`]
    ).catch(e => console.error('[background]', e.message));
    sendEmailIfEnabled(pool, payout.user_id, 'payoutRejected', { amountRon: payout.amount_ron, reason: admin_note }).catch(e => console.error('[background]', e.message));

    await logAdminAction(req, 'payout_reject', 'payout', id, { amount: payout.amount_ron, user_id: payout.user_id, reason: admin_note });

    res.json({
      success: true,
      payout_request: payout,
      message: 'Cererea a fost respinsă.'
    });
  } catch (error) {
    next(error);
  }
};

export const markPayoutAsPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_note, stripe_transfer_id } = req.body;

    const result = await pool.query(
      `UPDATE payout_requests
       SET status = 'paid', processed_at = NOW(),
           admin_note = COALESCE($1, admin_note),
           stripe_transfer_id = COALESCE($2, stripe_transfer_id)
       WHERE id = $3 AND status = 'processing'
       RETURNING *`,
      [admin_note || null, stripe_transfer_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cererea nu a fost găsită sau nu este în procesare.' });
    }

    const payout = result.rows[0];

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'payout_paid', 'Retragere procesată!', $2, '/wallet/payouts', NOW())`,
      [payout.user_id, `Retragerea de ${payout.amount_ron} RON a fost procesată cu succes. Fondurile ar trebui să apară în contul tău bancar în 1-3 zile lucrătoare.`]
    ).catch(e => console.error('[background]', e.message));

    sendEmailIfEnabled(pool, payout.user_id, 'payoutPaid', { amountRon: payout.amount_ron }).catch(e => console.error('[background]', e.message));

    await logAdminAction(req, 'payout_mark_paid', 'payout', id, {
      amount: payout.amount_ron,
      user_id: payout.user_id,
      stripe_transfer_id: stripe_transfer_id || null
    });

    res.json({
      success: true,
      payout_request: payout,
      message: 'Retragerea a fost marcată ca plătită.'
    });
  } catch (error) {
    next(error);
  }
};
// ── CSV Export helpers ────────────────────────────────────────────────────────

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = v => {
    const s = v == null ? '' : String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

export const exportFinancialCsv = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let where = '';
    const params = [];
    if (from) { params.push(from); where += ` AND mr.released_at >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND mr.released_at <= $${params.length}`; }

    const result = await pool.query(
      `SELECT
         mr.id,
         mr.released_at AS data_eliberare,
         p.title AS proiect,
         m.title AS milestone,
         mr.release_amount_ron AS suma_eliberata_ron,
         mr.claudiu_commission_amount_ron AS comision_ron,
         mr.expert_amount_ron AS expert_primeste_ron,
         uc.name AS client,
         ue.name AS expert
       FROM milestone_releases mr
       JOIN milestones m ON mr.milestone_id = m.id
       JOIN projects p ON m.project_id = p.id
       JOIN users uc ON p.client_id = uc.id
       LEFT JOIN users ue ON (p.expert_id = ue.id OR p.company_id = ue.id)
       WHERE TRUE ${where}
       ORDER BY mr.released_at DESC`,
      params
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="escro-financiar.csv"');
    res.send('﻿' + toCsv(result.rows)); // BOM for Excel UTF-8
  } catch (error) {
    next(error);
  }
};

export const exportUsersCsv = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         name AS nume,
         email,
         role AS rol,
         company AS companie,
         industry AS industrie,
         kyc_status AS status_kyc,
         verification_date AS data_verificare,
         created_at AS data_inregistrare
       FROM users
       WHERE role IN ('client','expert','company')
       ORDER BY created_at DESC`
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="escro-utilizatori.csv"');
    res.send('﻿' + toCsv(result.rows));
  } catch (error) {
    next(error);
  }
};

export const exportDisputesCsv = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         d.id,
         d.created_at AS data_deschidere,
         d.resolved_at AS data_rezolvare,
         d.status,
         d.reason AS motiv,
         d.decision_type AS tip_decizie,
         d.claudiu_decision AS decizie_admin,
         d.claudiu_release_amount_ron AS suma_eliberata_ron,
         m.title AS milestone,
         p.title AS proiect,
         ur.name AS deschis_de,
         uc.name AS client,
         ue.name AS expert
       FROM milestone_disputes d
       JOIN milestones m ON d.milestone_id = m.id
       JOIN projects p ON m.project_id = p.id
       JOIN users ur ON d.raised_by = ur.id
       LEFT JOIN users uc ON p.client_id = uc.id
       LEFT JOIN users ue ON COALESCE(p.expert_id, p.company_id) = ue.id
       ORDER BY d.created_at DESC`
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="escro-dispute.csv"');
    res.send('﻿' + toCsv(result.rows));
  } catch (error) {
    next(error);
  }
};
