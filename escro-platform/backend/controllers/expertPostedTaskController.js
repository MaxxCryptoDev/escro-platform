import pool from '../config/database.js';

/**
 * Expert POST a task (like company creating project, but expert-initiated)
 * This creates a project record with posted_by_expert flag
 * Admin must approve before it appears to companies
 */
export const createExpertPostedTask = async (req, res) => {
  try {
    const expertId = req.user.id;
    const { title, description, budget_ron, timeline_days, milestones, message } = req.body;

    // Validate required fields
    if (!title || !description || budget_ron === undefined || budget_ron === null) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, budget_ron' 
      });
    }

    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({ 
        error: 'At least one milestone is required' 
      });
    }

    // Validate budget > 0
    if (budget_ron <= 0) {
      return res.status(400).json({ 
        error: 'Budget must be greater than 0' 
      });
    }

    // Validate timeline > 0
    if (!timeline_days || timeline_days <= 0) {
      return res.status(400).json({ 
        error: 'Timeline must be greater than 0 days' 
      });
    }

    console.log('[DEBUG] Expert creating posted task:', {
      expertId,
      title,
      budget_ron,
      timeline_days,
      milestones_count: milestones.length
    });

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create project with posted_by_expert flag
      // client_id will be NULL for expert-posted tasks initially
      // It gets set when a company accepts the task
      const projectResult = await pool.query(
        `INSERT INTO projects (
          posted_by_expert,
          title,
          description,
          budget_ron,
          timeline_days,
          status,
          expert_posting_status,
          expert_posting_message,
          created_at,
          deadline
        )
        VALUES ($1, $2, $3, $4, $5, 'pending_admin_approval', 'pending', $6, NOW(), NOW() + make_interval(days => $7::int))
        RETURNING id`,
        [expertId, title, description, budget_ron, timeline_days, message || null, timeline_days]
      );

      const project_id = projectResult.rows[0].id;
      console.log('[DEBUG] Expert-posted project created with ID:', project_id);

      // Create milestones
      for (let index = 0; index < milestones.length; index++) {
        const milestone = milestones[index];
        
        // Validate milestone
        if (!milestone.title || milestone.percentage_of_budget === undefined) {
          throw new Error(`Milestone ${index + 1} missing required fields: title, percentage_of_budget`);
        }

        console.log(`[DEBUG] Creating milestone ${index + 1}:`, milestone.title);

        await pool.query(
          `INSERT INTO milestones (
            project_id,
            order_number,
            title,
            description,
            deliverable_description,
            percentage_of_budget,
            amount_ron,
            status,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
          [
            project_id,
            index + 1,
            milestone.title,
            milestone.title, // description defaults to title
            milestone.deliverable_description || '',
            milestone.percentage_of_budget,
            Math.round((budget_ron * milestone.percentage_of_budget) / 100 * 100) / 100
          ]
        );
      }

      // Commit transaction
      await pool.query('COMMIT');

      res.status(201).json({
        success: true,
        project_id,
        message: 'Task posted successfully! Admin will review it shortly.',
        expert_posting_status: 'pending',
        status: 'pending_admin_approval'
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('[ERROR] createExpertPostedTask:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Get my posted tasks (for expert dashboard)
 */
export const getMyPostedTasks = async (req, res) => {
  try {
    const expertId = req.user.id;

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
        p.updated_at,
        COUNT(m.id) as milestone_count,
        COALESCE(json_agg(
          json_build_object(
            'id', m.id,
            'title', m.title,
            'status', m.status,
            'percentage_of_budget', m.percentage_of_budget,
            'amount_ron', m.amount_ron
          ) ORDER BY m.order_number
        ) FILTER (WHERE m.id IS NOT NULL), '[]') as milestones
      FROM projects p
      LEFT JOIN milestones m ON p.id = m.project_id
      WHERE p.posted_by_expert = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [expertId]);

    console.log('[DEBUG] getMyPostedTasks - Found', result.rows.length, 'tasks for expert:', expertId);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[ERROR] getMyPostedTasks:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Get task requests for a specific project
 * This merges both:
 * 1. Companies bidding on expert-posted tasks (task_requests)
 * 2. Expert-posted tasks that companies can claim
 */
export const getProjectTaskRequests = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Get the project first to check if it's expert-posted
    const projectResult = await pool.query(
      `SELECT id, posted_by_expert, status FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Project not found' 
      });
    }

    const project = projectResult.rows[0];
    console.log('[DEBUG] getProjectTaskRequests - Project:', projectId, 'posted_by_expert:', project.posted_by_expert);

    // If this is an expert-posted task and user is the expert or admin
    if (project.posted_by_expert && (userId === project.posted_by_expert || req.user.role === 'admin')) {
      // Get bids from companies on this expert-posted task
      const bidsQuery = `
        SELECT 
          tr.id,
          tr.user_id,
          tr.project_id,
          tr.message,
          tr.status,
          tr.created_at,
          u.name,
          u.email,
          u.role,
          u.company,
          u.expertise,
          u.portfolio_description,
          u.profile_image_url
        FROM task_requests tr
        JOIN users u ON tr.user_id = u.id
        WHERE tr.project_id = $1 AND tr.status = 'approved'
        ORDER BY tr.created_at DESC
      `;

      const bidsResult = await pool.query(bidsQuery, [projectId]);
      console.log('[DEBUG] getProjectTaskRequests - Found', bidsResult.rows.length, 'approved bids for expert task');

      return res.json({
        success: true,
        data: bidsResult.rows,
        project_type: 'expert_posted'
      });
    }

    // If this is a regular company-posted project, show approved participants
    const participantsQuery = `
      SELECT 
        tr.id,
        tr.user_id,
        tr.project_id,
        tr.message,
        tr.status,
        tr.created_at,
        u.name,
        u.email,
        u.role,
        u.company,
        u.expertise,
        u.portfolio_description,
        u.profile_image_url
      FROM task_requests tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.project_id = $1 AND tr.status = 'approved'
      ORDER BY tr.created_at DESC
    `;

    const participantsResult = await pool.query(participantsQuery, [projectId]);
    console.log('[DEBUG] getProjectTaskRequests - Found', participantsResult.rows.length, 'approved requests for regular project');

    res.json({
      success: true,
      data: participantsResult.rows,
      project_type: 'company_posted'
    });

  } catch (error) {
    console.error('[ERROR] getProjectTaskRequests:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Company claims/accepts an expert-posted task
 * This creates a task_request that expert must approve
 */
export const claimExpertPostedTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id } = req.body;
    const { message } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Verify project exists and is expert-posted
    const projectResult = await pool.query(
      `SELECT id, posted_by_expert FROM projects WHERE id = $1`,
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!projectResult.rows[0].posted_by_expert) {
      return res.status(400).json({ error: 'This is not an expert-posted task' });
    }

    // Check for duplicate claim
    const existingQuery = `
      SELECT id FROM task_requests
      WHERE user_id = $1 AND project_id = $2 AND status = 'pending'
    `;
    const existingResult = await pool.query(existingQuery, [userId, project_id]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending claim for this task' });
    }

    // Create task request (claim)
    const query = `
      INSERT INTO task_requests (user_id, project_id, message, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, user_id, project_id, message, status, created_at
    `;

    const result = await pool.query(query, [userId, project_id, message || null]);

    console.log('[DEBUG] Company claimed expert-posted task:', {
      company_id: userId,
      project_id,
      request_id: result.rows[0].id
    });

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('[ERROR] claimExpertPostedTask:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
