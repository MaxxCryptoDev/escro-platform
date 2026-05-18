import pool from '../config/database.js';
import { logProjectHistory } from '../utils/projectHistory.js';

export const createTask = async (req, res, next) => {
  try {
    const { title, description, budget_ron, timeline_days } = req.body;
    const client_id = req.user.id;

    if (req.user.role !== 'admin') {
      const userCheck = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [client_id]);
      if (userCheck.rows.length === 0 || userCheck.rows[0].kyc_status !== 'verified') {
        return res.status(403).json({ error: 'Contul tău nu a fost aprobat de admin. Trebuie să fii verificat pentru a crea task-uri.' });
      }
    }

    if (!title || !description || !budget_ron) {
      return res.status(400).json({ error: 'Titlul, descrierea și bugetul sunt obligatorii' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (client_id, title, description, budget_ron, timeline_days, status, created_at, deadline)
       VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW() + make_interval(days => $5::int))
       RETURNING *`,
      [client_id, title, description, budget_ron || 0, timeline_days || 30]
    );

    res.status(201).json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error in createTask:', error);
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let result;
    if (userRole === 'admin') {
      result = await pool.query(
        `SELECT t.*, u.name as client_name, u.email as client_email, u.company as client_company,
         (SELECT COUNT(*) FROM projects WHERE task_id = t.id AND assignment_type = 'task_assignment' AND status != 'pending_admin_approval') as assignments_count
         FROM tasks t
         LEFT JOIN users u ON t.client_id = u.id
         WHERE t.client_id IS NOT NULL
         ORDER BY t.created_at DESC`
      );
    } else {
      result = await pool.query(
        `SELECT t.*, u.name as client_name, u.email as client_email, u.company as client_company,
         (SELECT COUNT(*) FROM projects WHERE task_id = t.id AND assignment_type = 'task_assignment' AND status != 'pending_admin_approval') as assignments_count
         FROM tasks t
         LEFT JOIN users u ON t.client_id = u.id
         WHERE t.client_id = $1 AND t.status != 'cancelled'
         ORDER BY t.created_at DESC`,
        [userId]
      );
    }

    const tasksWithAssignments = await Promise.all(
      result.rows.map(async (task) => {
        const assignmentsResult = await pool.query(
          `SELECT p.id, p.title, p.status, p.budget_ron, p.expert_id, p.company_id,
           e.name as expert_name, e.profile_image_url as expert_image,
           c.name as company_name, c.company as company_name_full, c.profile_image_url as company_image
           FROM projects p
           LEFT JOIN users e ON p.expert_id = e.id
           LEFT JOIN users c ON p.company_id = c.id
           WHERE p.task_id = $1 AND p.assignment_type = 'task_assignment' 
           AND p.status != 'pending_admin_approval'
           ORDER BY p.created_at DESC`,
          [task.id]
        );
        return {
          ...task,
          assignments: assignmentsResult.rows
        };
      })
    );

    res.json({
      success: true,
      tasks: tasksWithAssignments
    });
  } catch (error) {
    console.error('Error in getTasks:', error);
    next(error);
  }
};

export const getTaskDetail = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    const taskResult = await pool.query(
      `SELECT t.*, u.name as client_name, u.email as client_email, u.company as client_company,
       u.profile_image_url as client_profile_image, u.phone as client_phone, u.bio as client_bio,
       u.industry as client_industry, u.expertise as client_profession, u.experience as client_experience_years
       FROM tasks t
       LEFT JOIN users u ON t.client_id = u.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0];

    const isOwner = userId && String(task.client_id) === String(userId);

    const assignmentsResult = await pool.query(
      `SELECT p.id, p.title, p.description, p.status, p.budget_ron, p.timeline_days, p.created_at,
       p.expert_id, p.company_id,
       e.name as expert_name, e.email as expert_email, e.profile_image_url as expert_image,
       e.expertise as expert_expertise, e.industry as expert_industry, e.experience as expert_experience,
       c.name as company_name, c.email as company_email, c.company as company_name_full, 
       c.profile_image_url as company_image, c.expertise as company_expertise, c.industry as company_industry
       FROM projects p
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       WHERE p.task_id = $1 AND p.assignment_type = 'task_assignment' 
       ORDER BY p.created_at DESC`,
      [taskId]
    );

    const totalAssigned = assignmentsResult.rows.reduce((sum, a) => sum + (parseFloat(a.budget_ron) || 0), 0);
    const remainingBudget = (parseFloat(task.budget_ron) || 0) - totalAssigned;

    res.json({
      success: true,
      task: {
        ...task,
        is_owner: isOwner,
        total_assigned_budget: totalAssigned,
        remaining_budget: remainingBudget
      },
      assignments: assignmentsResult.rows
    });
  } catch (error) {
    console.error('Error in getTaskDetail:', error);
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title, description, budget_ron, timeline_days, status } = req.body;
    const userId = req.user.id;

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0];
    if (String(task.client_id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nu ai permisiunea să editezi acest task' });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (title) {
      updateFields.push(`title = $${paramCount++}`);
      updateValues.push(title);
    }
    if (description) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    if (budget_ron) {
      updateFields.push(`budget_ron = $${paramCount++}`);
      updateValues.push(budget_ron);
    }
    if (timeline_days) {
      updateFields.push(`timeline_days = $${paramCount++}`);
      updateValues.push(timeline_days);
    }
    // Status transitions are restricted — owners can only cancel a task; admin handles other transitions
    if (status) {
      const ALLOWED_USER_STATUSES = ['cancelled'];
      if (req.user.role !== 'admin' && !ALLOWED_USER_STATUSES.includes(status)) {
        return res.status(403).json({ error: 'Doar adminul poate seta alte status-uri. Poți doar anula task-ul.' });
      }
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(taskId);

    const result = await pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error in updateTask:', error);
    next(error);
  }
};

export const createAssignment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { taskId } = req.params;
    const { title, description, budget_ron, timeline_days, expert_id, company_id, milestones } = req.body;
    const userId = req.user.id;

    const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0];
    if (String(task.client_id) !== String(userId) && req.user.role !== 'admin') {
      client.release();
      return res.status(403).json({ error: 'Nu ai permisiunea să adaugi asignări la acest task' });
    }

    if (!title || !description) {
      client.release();
      return res.status(400).json({ error: 'Titlul și descrierea sunt obligatorii' });
    }

    const { service_type } = req.body;
    const safeServiceType = ['direct', 'matching'].includes(service_type) ? service_type : 'matching';
    const effectiveBudget = parseFloat(budget_ron) || parseFloat(task.budget_ron) || 0;

    const assignedPartyId = expert_id || company_id;

    // Only experts and companies can be assigned as prestator. Reject individual / admin / unknown.
    if (assignedPartyId) {
      const roleRes = await client.query(`SELECT role FROM users WHERE id = $1`, [assignedPartyId]);
      const targetRole = roleRes.rows[0]?.role;
      if (!['expert', 'company'].includes(targetRole)) {
        client.release();
        return res.status(400).json({ error: 'Doar experții și companiile pot fi asignați ca prestator pe un task.' });
      }
    }

    const initialStatus = assignedPartyId ? 'pending_expert_approval' : 'pending_admin_approval';

    await client.query('BEGIN');

    const projectResult = await client.query(
      `INSERT INTO projects (client_id, expert_id, company_id, task_id, title, description, budget_ron, timeline_days, status, service_type, assignment_type, created_by_admin, created_at, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'task_assignment', false, NOW(), NOW() + make_interval(days => $8::int))
       RETURNING *`,
      [
        task.client_id,
        expert_id || null,
        company_id || null,
        taskId,
        title,
        description,
        effectiveBudget,
        timeline_days || task.timeline_days,
        initialStatus,
        safeServiceType
      ]
    );

    const project_id = projectResult.rows[0].id;

    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      for (let index = 0; index < milestones.length; index++) {
        const milestone = milestones[index];
        const pct = parseFloat(milestone.percentage_of_budget) || 0;
        await client.query(
          `INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
          [
            project_id,
            index + 1,
            milestone.title,
            milestone.title,
            milestone.deliverable_description || '',
            pct,
            Math.round(effectiveBudget * pct / 100 * 100) / 100
          ]
        );
      }
    }

    if (assignedPartyId) {
      const projectTitle = projectResult.rows[0].title;
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_acceptance_required', $2, $3, $4, NOW())`,
        [
          assignedPartyId,
          'Task nou de acceptat',
          `Clientul te-a invitat direct pe taskul "${projectTitle}". Verifică detaliile și acceptă pentru a demara colaborarea.`,
          `/project/${taskId}/assignment/${project_id}`
        ]
      );
    }

    await client.query('COMMIT');

    const assignmentWithDetails = await client.query(
      `SELECT p.*,
       e.name as expert_name, e.email as expert_email, e.profile_image_url as expert_image,
       c.name as company_name, c.email as company_email, c.company as company_name_full, c.profile_image_url as company_image
       FROM projects p
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       WHERE p.id = $1`,
      [project_id]
    );

    res.status(201).json({
      success: true,
      assignment: assignmentWithDetails.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.warn('[bg]', e.message));
    console.error('Error in createAssignment:', error);
    next(error);
  } finally {
    client.release();
  }
};

export const assignUserToAssignment = async (req, res, next) => {
  try {
    const { taskId, assignmentId } = req.params;
    const { expert_id, company_id } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projectResult = await pool.query(
      `SELECT p.*, t.client_id as task_client_id FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       WHERE p.id = $1 AND p.task_id = $2`,
      [assignmentId, taskId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only the task creator (client) or admin can assign users to this assignment
    const taskOwnerId = projectResult.rows[0].task_client_id || projectResult.rows[0].client_id;
    if (!isAdmin && String(taskOwnerId) !== String(userId)) {
      return res.status(403).json({ message: 'Only the task creator can assign users' });
    }

    // Only allow assignment on assignments still in initial states — don't reset completed/disputed
    const currentStatus = projectResult.rows[0].status;
    const ASSIGNABLE_STATUSES = ['pending', 'pending_admin_approval', 'pending_assignment', 'pending_expert_approval', 'open'];
    if (!ASSIGNABLE_STATUSES.includes(currentStatus)) {
      return res.status(409).json({
        message: `Cannot reassign — assignment status is '${currentStatus}', not in an assignable state.`
      });
    }

    // Only experts and companies can be assigned as prestator
    const targetPrestatorId = expert_id || company_id;
    if (targetPrestatorId) {
      const roleRes = await pool.query(`SELECT role FROM users WHERE id = $1`, [targetPrestatorId]);
      const targetRole = roleRes.rows[0]?.role;
      if (!['expert', 'company'].includes(targetRole)) {
        return res.status(400).json({ message: 'Doar experții și companiile pot fi asignați ca prestator.' });
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (expert_id !== undefined) {
      updateFields.push(`expert_id = $${paramCount++}`);
      updateValues.push(expert_id || null);
    }
    if (company_id !== undefined) {
      updateFields.push(`company_id = $${paramCount++}`);
      updateValues.push(company_id || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'expert_id sau company_id este necesar' });
    }

    updateFields.push(`status = $${paramCount++}`);
    updateValues.push('in_progress');
    updateValues.push(assignmentId);

    const result = await pool.query(
      `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Error in assignUserToAssignment:', error);
    next(error);
  }
};

export const clientApproveAssignment = async (req, res, next) => {
  try {
    const { taskId, assignmentId } = req.params;
    const userId = req.user.id;

    const projectResult = await pool.query(
      `SELECT p.*, t.client_id as task_client_id FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       WHERE p.id = $1 AND p.task_id = $2`,
      [assignmentId, taskId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment negăsit' });
    }

    const project = projectResult.rows[0];

    if (String(project.task_client_id || project.client_id) !== String(userId)) {
      return res.status(403).json({ error: 'Doar clientul poate aproba acest task' });
    }

    if (project.status !== 'pending_client_approval') {
      return res.status(400).json({ error: 'Taskul nu este în așteptare client' });
    }

    const assignedPartyId = project.expert_id || project.company_id;

    // If assigned party exists, verify they're still valid (kyc + active)
    if (assignedPartyId) {
      const partyCheck = await pool.query(
        `SELECT kyc_status, deleted_at FROM users WHERE id = $1`,
        [assignedPartyId]
      );
      if (partyCheck.rows.length === 0 || partyCheck.rows[0].deleted_at) {
        return res.status(400).json({ error: 'Prestatorul asignat nu mai e activ. Cere admin re-asignare.' });
      }
      if (partyCheck.rows[0].kyc_status !== 'verified') {
        return res.status(400).json({ error: 'Prestatorul asignat nu mai e verificat KYC.' });
      }
    }

    const newStatus = assignedPartyId ? 'pending_expert_approval' : 'pending_admin_approval';

    const result = await pool.query(
      `UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [newStatus, assignmentId]
    );

    // Notify the assigned expert/company that they need to accept the task
    if (assignedPartyId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_acceptance_required', $2, $3, $4, NOW())`,
        [
          assignedPartyId,
          'Task nou de acceptat',
          `Clientul a aprobat taskul "${project.title}". Verifică detaliile și acceptă pentru a demara colaborarea.`,
          `/project/${project.task_id}/assignment/${assignmentId}`
        ]
      );
    }

    res.json({ success: true, assignment: result.rows[0] });
  } catch (error) {
    console.error('clientApproveAssignment error:', error);
    next(error);
  }
};

export const clientRejectAssignment = async (req, res, next) => {
  try {
    const { taskId, assignmentId } = req.params;
    const userId = req.user.id;

    const projectResult = await pool.query(
      `SELECT p.*, t.client_id as task_client_id FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       WHERE p.id = $1 AND p.task_id = $2`,
      [assignmentId, taskId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment negăsit' });
    }

    const project = projectResult.rows[0];

    if (String(project.task_client_id || project.client_id) !== String(userId)) {
      return res.status(403).json({ error: 'Doar clientul poate respinge acest task' });
    }

    await pool.query(
      `UPDATE projects SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [assignmentId]
    );

    const assignedId = project.expert_id || project.company_id;
    if (assignedId) {
      const projTitle = project.title || 'task';
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_rejected_by_client', 'Task respins de client', $2, $3, NOW())`,
        [assignedId, `Clientul a respins task-ul „${projTitle}".`, `/project/${taskId}/assignment/${assignmentId}`]
      ).catch(e => console.warn('[bg]', e.message));
    }

    res.json({ success: true, message: 'Task respins' });
  } catch (error) {
    console.error('clientRejectAssignment error:', error);
    next(error);
  }
};

export const expertAcceptAssignment = async (req, res, next) => {
  try {
    const { taskId, assignmentId } = req.params;
    const userId = req.user.id;

    const projectResult = await pool.query(
      `SELECT p.*, t.client_id as task_client_id FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       WHERE p.id = $1 AND p.task_id = $2`,
      [assignmentId, taskId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment negăsit' });
    }

    const project = projectResult.rows[0];
    const isAssignedParty = String(project.expert_id) === String(userId) || String(project.company_id) === String(userId);

    if (!isAssignedParty) {
      return res.status(403).json({ error: 'Doar prestatorul asignat poate accepta acest task' });
    }

    if (project.status !== 'pending_expert_approval') {
      return res.status(400).json({ error: 'Taskul nu este în așteptarea acceptului tău' });
    }

    const result = await pool.query(
      `UPDATE projects SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [assignmentId]
    );

    const clientId = project.task_client_id || project.client_id;
    if (clientId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_accepted', $2, $3, $4, NOW())`,
        [
          clientId,
          'Task acceptat',
          `Prestatorul a acceptat taskul "${project.title}". Puteți demara acum colaborarea și contractul.`,
          `/project/${taskId}/assignment/${assignmentId}`
        ]
      );
    }

    // Confirm to the expert/company that their acceptance was recorded
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'expert_accepted', 'Task acceptat', $2, $3, NOW())`,
      [userId, `Ai acceptat taskul "${project.title}". Clientul a fost notificat — acum puteți semna contractele.`, `/project/${taskId}/assignment/${assignmentId}`]
    ).catch(e => console.warn('[bg]', e.message));

    logProjectHistory(assignmentId, userId, 'prestator_accept_assignment_pm');

    res.json({ success: true, assignment: result.rows[0] });
  } catch (error) {
    console.error('expertAcceptAssignment error:', error);
    next(error);
  }
};

export const expertRejectAssignment = async (req, res, next) => {
  try {
    const { taskId, assignmentId } = req.params;
    const userId = req.user.id;

    const projectResult = await pool.query(
      `SELECT p.*, t.client_id as task_client_id FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       WHERE p.id = $1 AND p.task_id = $2`,
      [assignmentId, taskId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment negăsit' });
    }

    const project = projectResult.rows[0];
    const isAssignedParty = String(project.expert_id) === String(userId) || String(project.company_id) === String(userId);

    if (!isAssignedParty) {
      return res.status(403).json({ error: 'Doar prestatorul asignat poate refuza acest task' });
    }

    await pool.query(
      `UPDATE projects SET status = 'pending_admin_approval', expert_id = NULL, company_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [assignmentId]
    );

    const clientId = project.task_client_id || project.client_id;
    if (clientId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_rejected_by_expert', $2, $3, $4, NOW())`,
        [
          clientId,
          'Task refuzat de prestator',
          `Prestatorul a refuzat taskul "${project.title}". Adminul va fi notificat pentru reasignare.`,
          `/project/${taskId}/assignment/${assignmentId}`
        ]
      );
    }

    logProjectHistory(assignmentId, userId, 'prestator_reject_assignment_pm');

    res.json({ success: true, message: 'Task refuzat, returnat spre reasignare' });
  } catch (error) {
    console.error('expertRejectAssignment error:', error);
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0];
    if (String(task.client_id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nu ai permisiunea să ștergi acest task' });
    }

    // Block deletion if any sub-assignment still has funds in escrow
    const escrowCheck = await pool.query(
      `SELECT 1 FROM escrow_accounts ea
       JOIN projects p ON ea.project_id = p.id
       WHERE p.task_id = $1 AND COALESCE(ea.held_balance_ron, 0) > 0
       LIMIT 1`,
      [taskId]
    );
    if (escrowCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Task-ul are sub-proiecte cu fonduri active în escrow. Procesează refund-ul înainte.'
      });
    }

    // Soft delete: keep the row so admin can still inspect; set status to 'cancelled'
    await pool.query(
      `UPDATE tasks SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );

    res.json({
      success: true,
      message: 'Task anulat. Va rămâne vizibil doar pentru admin.'
    });
  } catch (error) {
    console.error('Error in deleteTask:', error);
    next(error);
  }
};

export const getAssignmentDetail = async (req, res, next) => {
  try {
    const { taskId, assignmentId } = req.params;
    const userId = req.user?.id;

    const projectResult = await pool.query(
      `SELECT p.*, t.title as task_title, t.description as task_description, t.budget_ron as task_budget,
       u.name as client_name, u.email as client_email, u.company as client_company, u.profile_image_url as client_image,
       u.industry as client_industry, u.expertise as client_profession, u.experience as client_experience_years,
       e.name as expert_name, e.email as expert_email, e.profile_image_url as expert_image,
       e.expertise as expert_expertise, e.industry as expert_industry, e.experience as expert_experience,
       c.name as company_name, c.email as company_email, c.company as company_name_full, 
       c.profile_image_url as company_image, c.expertise as company_expertise, c.industry as company_industry
       FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       WHERE p.id = $1 AND p.task_id = $2`,
      [assignmentId, taskId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const project = projectResult.rows[0];

    const isClient = userId && String(project.client_id) === String(userId);
    const isExpert = userId && String(project.expert_id) === String(userId);
    const isCompany = userId && String(project.company_id) === String(userId);
    const isAdmin = req.user?.role === 'admin';

    // Also allow the task creator (parent task's client_id) to view assignments
    const taskOwnerRes = await pool.query('SELECT client_id FROM tasks WHERE id = $1', [taskId]);
    const isTaskCreator = userId && String(taskOwnerRes.rows[0]?.client_id) === String(userId);

    if (!isClient && !isExpert && !isCompany && !isAdmin && !isTaskCreator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number ASC',
      [assignmentId]
    );

    res.json({
      success: true,
      assignment: {
        ...project,
        is_client: isClient,
        is_expert: isExpert,
        is_company: isCompany,
        is_party: isClient || isExpert || isCompany
      },
      milestones: milestonesResult.rows
    });
  } catch (error) {
    console.error('Error in getAssignmentDetail:', error);
    next(error);
  }
};

// Client requests admin approval to finalize the PM task (close it out).
// Admin will see this in their dashboard and approve/reject.
export const requestPmFinalization = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const taskRes = await pool.query(
      `SELECT t.id, t.client_id, t.title, t.status, t.pm_finalization_requested_at
       FROM tasks t WHERE t.id = $1`,
      [taskId]
    );
    if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskRes.rows[0];

    if (String(task.client_id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Doar beneficiarul poate solicita finalizarea.' });
    }

    if (['completed', 'cancelled'].includes(task.status)) {
      return res.status(409).json({ error: `Task-ul e deja în stare '${task.status}'.` });
    }

    if (task.pm_finalization_requested_at) {
      return res.status(409).json({ error: 'Cererea de finalizare a fost deja trimisă.' });
    }

    // Verify all sub-assignments are completed before allowing finalize request
    const subRes = await pool.query(
      `SELECT status FROM projects WHERE task_id = $1 AND assignment_type = 'task_assignment'
         AND status != 'pending_admin_approval'`,
      [taskId]
    );
    if (subRes.rows.length === 0) {
      return res.status(412).json({ error: 'Task-ul nu are sub-asignări active. Nimic de finalizat.' });
    }
    const pending = subRes.rows.filter(r => r.status !== 'completed');
    if (pending.length > 0) {
      return res.status(412).json({
        error: `Toate sub-asignările trebuie finalizate (${pending.length} încă nu sunt completate).`
      });
    }

    await pool.query(
      `UPDATE tasks SET pm_finalization_requested_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [taskId]
    );

    // Notify admin(s)
    const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const a of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'pm_finalize_request', 'Cerere finalizare PM',
                 $2, $3, NOW())`,
        [a.id, `Beneficiarul a solicitat închiderea task-ului PM „${task.title}". Verifică și aprobă.`, `/project/${taskId}`]
      ).catch(() => {});
    }

    res.json({ success: true, requested_at: new Date().toISOString() });
  } catch (error) {
    console.error('[requestPmFinalization]', error);
    next(error);
  }
};

// Admin approves the finalization request — closes the task.
export const approvePmFinalization = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
    const { taskId } = req.params;

    const taskRes = await pool.query(
      `SELECT id, client_id, title, status, pm_finalization_requested_at
       FROM tasks WHERE id = $1`,
      [taskId]
    );
    if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskRes.rows[0];

    if (!task.pm_finalization_requested_at) {
      return res.status(409).json({ error: 'Nu există cerere de finalizare pentru acest task.' });
    }
    if (task.status === 'completed') {
      return res.status(409).json({ error: 'Task-ul e deja finalizat.' });
    }

    const finalContractRes = await pool.query(
      `SELECT status FROM contracts WHERE task_id = $1 AND contract_type = 'final' LIMIT 1`,
      [taskId]
    );
    if (finalContractRes.rows.length === 0) {
      return res.status(412).json({
        error: 'Contractul final PM nu există. Beneficiarul trebuie să-l genereze și să-l semneze înainte de aprobare.',
      });
    }
    if (finalContractRes.rows[0].status !== 'accepted') {
      return res.status(412).json({
        error: 'Contractul final PM nu este semnat de beneficiar. Așteaptă semnarea înainte de aprobare.',
      });
    }

    await pool.query(
      `UPDATE tasks SET status = 'completed', completed_at = NOW(),
                        pm_finalization_approved_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );

    // Notify the client
    if (task.client_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'pm_finalize_approved', 'Proiect finalizat',
                 $2, $3, NOW())`,
        [task.client_id, `Adminul a confirmat închiderea task-ului PM „${task.title}". Proiectul este complet.`, `/project/${taskId}`]
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[approvePmFinalization]', error);
    next(error);
  }
};
