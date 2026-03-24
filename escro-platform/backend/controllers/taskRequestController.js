import pool from '../config/database.js';

// Create a task participation request
export const createTaskRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, message } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Check if user already has a pending request for this project
    const existingQuery = `
      SELECT id FROM task_requests
      WHERE user_id = $1 AND project_id = $2 AND status = 'pending'
    `;
    const existingResult = await pool.query(existingQuery, [userId, project_id]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request for this project' });
    }

    // Create the request
    const query = `
      INSERT INTO task_requests (user_id, project_id, message, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, user_id, project_id, message, status, created_at
    `;

    const result = await pool.query(query, [userId, project_id, message || null]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating task request:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get all task requests (admin only)
export const getAllTaskRequests = async (req, res) => {
  try {
    const query = `
      SELECT 
        tr.id,
        tr.user_id,
        tr.project_id,
        tr.message,
        tr.status,
        tr.created_at,
        tr.updated_at,
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
      ORDER BY tr.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching task requests:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get task requests for a specific project (for client view)
export const getProjectTaskRequests = async (req, res) => {
  try {
    const { projectId } = req.params;

    const query = `
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

    const result = await pool.query(query, [projectId]);

    console.log('[DEBUG] getProjectTaskRequests - Found', result.rows.length, 'approved requests for project:', projectId);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching project task requests:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Update task request status (admin only)
export const updateTaskRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // First, get the task request details
    const getRequestQuery = `
      SELECT id, user_id, project_id, status FROM task_requests WHERE id = $1
    `;
    const requestResult = await pool.query(getRequestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task request not found' });
    }

    const taskRequest = requestResult.rows[0];

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update task request status
      const updateRequestQuery = `
        UPDATE task_requests
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, user_id, project_id, message, status, created_at, updated_at
      `;
      const updateResult = await pool.query(updateRequestQuery, [status, requestId]);

      // If approved, also update the project with expert_id and set status to 'assigned'
      if (status === 'approved') {
        const updateProjectQuery = `
          UPDATE projects
          SET expert_id = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `;
        await pool.query(updateProjectQuery, [taskRequest.user_id, taskRequest.project_id]);
      }

      // Commit transaction
      await pool.query('COMMIT');

      res.json({
        success: true,
        data: updateResult.rows[0]
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating task request:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get my task requests
export const getMyTaskRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        tr.id,
        tr.user_id,
        tr.project_id,
        tr.message,
        tr.status,
        tr.created_at,
        p.title as project_title,
        p.description as project_description,
        c.name as client_name,
        c.email as client_email
      FROM task_requests tr
      JOIN projects p ON tr.project_id = p.id
      JOIN users c ON p.client_id = c.id
      WHERE tr.user_id = $1
      ORDER BY tr.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching my task requests:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
