import pool from '../config/database.js';

export const createTask = async (req, res, next) => {
  try {
    const { title, description, budget_ron, timeline_days } = req.body;
    const client_id = req.user.id;

    if (!title || !description || !budget_ron) {
      return res.status(400).json({ error: 'Titlul, descrierea și bugetul sunt obligatorii' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (client_id, title, description, budget_ron, timeline_days, status, created_at, deadline)
       VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW() + make_interval(days => $4::int))
       RETURNING *`,
      [client_id, title, description, timeline_days || 30]
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
         WHERE t.client_id = $1
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
    if (String(task.client_id) !== String(userId)) {
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
    if (status) {
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
  try {
    const { taskId } = req.params;
    const { title, description, budget_ron, timeline_days, expert_id, company_id, milestones } = req.body;
    const userId = req.user.id;

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0];
    if (String(task.client_id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nu ai permisiunea să adaugi asignări la acest task' });
    }

    if (!title || !description) {
      return res.status(400).json({ error: 'Titlul și descrierea sunt obligatorii' });
    }

    const projectResult = await pool.query(
      `INSERT INTO projects (client_id, expert_id, company_id, task_id, title, description, budget_ron, timeline_days, status, service_type, assignment_type, created_at, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'matching', 'task_assignment', NOW(), NOW() + make_interval(days => $8::int))
       RETURNING *`,
      [
        task.client_id,
        expert_id || null,
        company_id || null,
        taskId,
        title,
        description,
        budget_ron || task.budget_ron,
        timeline_days || task.timeline_days,
        'pending_admin_approval'
      ]
    );

    const project_id = projectResult.rows[0].id;

    // Delete the original PM project (standalone) - we only need the assignment project
    await pool.query(
      `DELETE FROM projects WHERE task_id = $1 AND assignment_type = 'standalone' AND service_type = 'project_management'`,
      [taskId]
    );

    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      for (let index = 0; index < milestones.length; index++) {
        const milestone = milestones[index];
        await pool.query(
          `INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
          [
            project_id,
            index + 1,
            milestone.title,
            milestone.title,
            milestone.deliverable_description,
            milestone.percentage_of_budget,
            Math.round((budget_ron * milestone.percentage_of_budget) / 100 * 100) / 100
          ]
        );
      }
    }

    const assignmentWithDetails = await pool.query(
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
    console.error('Error in createAssignment:', error);
    next(error);
  }
};

export const assignUserToAssignment = async (req, res, next) => {
  try {
    const { taskId, assignmentId } = req.params;
    const { expert_id, company_id } = req.body;

    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND task_id = $2',
      [assignmentId, taskId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (expert_id) {
      updateFields.push(`expert_id = $${paramCount++}`);
      updateValues.push(expert_id);
      updateFields.push(`company_id = $${paramCount++}`);
      updateValues.push(null);
    } else if (company_id) {
      updateFields.push(`company_id = $${paramCount++}`);
      updateValues.push(company_id);
      updateFields.push(`expert_id = $${paramCount++}`);
      updateValues.push(null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'expert_id sau company_id este necesar' });
    }

    updateFields.push(`status = $${paramCount++}`);
    updateValues.push('assigned');
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

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    res.json({
      success: true,
      message: 'Task șters cu succes'
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

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number ASC',
      [assignmentId]
    );

    const isClient = userId && String(project.client_id) === String(userId);
    const isExpert = userId && String(project.expert_id) === String(userId);
    const isCompany = userId && String(project.company_id) === String(userId);

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
