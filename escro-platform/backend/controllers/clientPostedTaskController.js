import pool from '../config/database.js';

/**
 * Company POST a task (bidirectional - companies can post just like experts)
 * This creates a project record with posted_by_client flag
 * Admin must approve before it appears to experts
 */
export const createClientPostedTask = async (req, res) => {
  try {
    const clientId = req.user.id;
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

    if (budget_ron <= 0) {
      return res.status(400).json({ 
        error: 'Budget must be greater than 0' 
      });
    }

    if (!timeline_days || timeline_days <= 0) {
      return res.status(400).json({ 
        error: 'Timeline must be greater than 0 days' 
      });
    }

    console.log('[DEBUG] Company creating posted task:', {
      clientId,
      title,
      budget_ron,
      timeline_days,
      milestones_count: milestones.length
    });

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create project with posted_by_client flag
      const projectResult = await pool.query(
        `INSERT INTO projects (
          posted_by_client,
          client_id,
          title,
          description,
          budget_ron,
          timeline_days,
          status,
          client_posting_status,
          client_posting_message,
          created_at,
          deadline
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending_admin_approval', 'pending', $7, NOW(), NOW() + make_interval(days => $8::int))
        RETURNING id`,
        [clientId, clientId, title, description, budget_ron, timeline_days, message || null, timeline_days]
      );

      const project_id = projectResult.rows[0].id;
      console.log('[DEBUG] Client-posted project created with ID:', project_id);

      // Create milestones
      for (let index = 0; index < milestones.length; index++) {
        const milestone = milestones[index];
        
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
            milestone.title,
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
        client_posting_status: 'pending',
        status: 'pending_admin_approval'
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('[ERROR] createClientPostedTask:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Get my posted tasks (for client dashboard)
 */
export const getMyPostedTasks = async (req, res) => {
  try {
    const clientId = req.user.id;

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
      WHERE p.posted_by_client = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [clientId]);

    console.log('[DEBUG] getMyPostedTasks - Found', result.rows.length, 'tasks for company:', clientId);

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
 * Expert/Company bids on company-posted task
 */
export const bidOnClientPostedTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id } = req.body;
    const { message } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Verify project exists and is client-posted
    const projectResult = await pool.query(
      `SELECT id, posted_by_client FROM projects WHERE id = $1`,
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!projectResult.rows[0].posted_by_client) {
      return res.status(400).json({ error: 'This is not a client-posted task' });
    }

    // Check for duplicate bid
    const existingQuery = `
      SELECT id FROM task_requests
      WHERE user_id = $1 AND project_id = $2 AND status = 'pending'
    `;
    const existingResult = await pool.query(existingQuery, [userId, project_id]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending bid for this task' });
    }

    // Create task request (bid)
    const query = `
      INSERT INTO task_requests (user_id, project_id, message, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, user_id, project_id, message, status, created_at
    `;

    const result = await pool.query(query, [userId, project_id, message || null]);

    console.log('[DEBUG] User bid on client-posted task:', {
      user_id: userId,
      project_id,
      request_id: result.rows[0].id
    });

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('[ERROR] bidOnClientPostedTask:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Get bids for a company-posted task
 */
export const getTaskBids = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Verify user owns this posted task
    const projectResult = await pool.query(
      `SELECT posted_by_client FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0 || projectResult.rows[0].posted_by_client !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get all bids
    const query = `
      SELECT 
        tr.id,
        tr.user_id,
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
      WHERE tr.project_id = $1
      ORDER BY tr.status DESC, tr.created_at DESC
    `;

    const result = await pool.query(query, [projectId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[ERROR] getTaskBids:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
