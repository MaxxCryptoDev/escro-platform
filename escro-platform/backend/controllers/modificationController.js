import pool from '../config/database.js';

export const proposeProjectModification = async (req, res, next) => {
  try {
    const { project_id, field_name, new_value } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Nu ești parte din acest proiect' });
    }

    if (party1Id === party2Id) {
      return res.status(400).json({ error: 'Proiectul trebuie să aibă cel puțin două părți' });
    }

    const allowedFields = ['title', 'description', 'budget_ron', 'timeline_days', 'deadline'];
    if (!allowedFields.includes(field_name)) {
      return res.status(400).json({ error: 'Câmp invalid pentru modificare' });
    }

    const oldValue = project[field_name];

    const isParty1 = userId === party1Id;
    
    const result = await pool.query(
      `INSERT INTO project_modifications (project_id, modification_type, field_name, old_value, new_value, proposed_by, proposed_by_party1)
       VALUES ($1, 'project', $2, $3, $4, $5, $6)
       RETURNING *`,
      [project_id, field_name, String(oldValue), String(new_value), userId, isParty1]
    );

    res.status(201).json({ success: true, modification: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const proposeMilestoneModification = async (req, res, next) => {
  try {
    const { project_id, milestone_id, field_name, new_value } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const milestoneResult = await pool.query('SELECT * FROM milestones WHERE id = $1 AND project_id = $2', [milestone_id, project_id]);
    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    const milestone = milestoneResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Nu ești parte din acest proiect' });
    }

    const allowedFields = ['title', 'description', 'deliverable_description', 'amount_ron', 'percentage_of_budget', 'deadline', 'order_number'];
    if (!allowedFields.includes(field_name)) {
      return res.status(400).json({ error: 'Câmp invalid pentru modificare' });
    }

    const oldValue = milestone[field_name];

    const isParty1 = userId === party1Id;

    const result = await pool.query(
      `INSERT INTO project_modifications (project_id, milestone_id, modification_type, field_name, old_value, new_value, proposed_by, proposed_by_party1)
       VALUES ($1, $2, 'milestone', $3, $4, $5, $6, $7)
       RETURNING *`,
      [project_id, milestone_id, field_name, String(oldValue), String(new_value), userId, isParty1]
    );

    res.status(201).json({ success: true, modification: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const proposeMilestoneCreate = async (req, res, next) => {
  try {
    const { project_id, title, description, deliverable_description, amount_ron, percentage_of_budget, deadline, order_number } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Nu ești parte din acest proiect' });
    }

    const isParty1 = userId === party1Id;

    const result = await pool.query(
      `INSERT INTO project_modifications (project_id, modification_type, new_value, proposed_by, proposed_by_party1)
       VALUES ($1, 'milestone_create', $2, $3, $4)
       RETURNING *`,
      [project_id, JSON.stringify({ title, description, deliverable_description, amount_ron, percentage_of_budget, deadline, order_number }), userId, isParty1]
    );

    res.status(201).json({ success: true, modification: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const proposeMilestoneDelete = async (req, res, next) => {
  try {
    const { project_id, milestone_id } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const milestoneResult = await pool.query('SELECT * FROM milestones WHERE id = $1 AND project_id = $2', [milestone_id, project_id]);
    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    const milestone = milestoneResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Nu ești parte din acest proiect' });
    }

    const isParty1 = userId === party1Id;

    const result = await pool.query(
      `INSERT INTO project_modifications (project_id, milestone_id, modification_type, old_value, proposed_by, proposed_by_party1)
       VALUES ($1, $2, 'milestone_delete', $3, $4, $5)
       RETURNING *`,
      [project_id, milestone_id, JSON.stringify(milestone), userId, isParty1]
    );

    res.status(201).json({ success: true, modification: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const approveModification = async (req, res, next) => {
  try {
    const { modification_id } = req.params;
    const userId = req.user.id;

    const modResult = await pool.query('SELECT * FROM project_modifications WHERE id = $1', [modification_id]);
    if (modResult.rows.length === 0) {
      return res.status(404).json({ error: 'Modification not found' });
    }
    const mod = modResult.rows[0];

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [mod.project_id]);
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Nu ești parte din acest proiect' });
    }

    if (mod.proposed_by === userId) {
      return res.status(400).json({ error: 'Nu poți aproba propria ta modificare' });
    }

    if (userId === party1Id && mod.party1_approved) {
      return res.status(400).json({ error: 'Ai deja aprobat această modificare' });
    }
    if (userId === party2Id && mod.party2_approved) {
      return res.status(400).json({ error: 'Ai deja aprobat această modificare' });
    }

    let updateQuery = '';
    if (userId === party1Id) {
      updateQuery = `UPDATE project_modifications SET party1_approved = TRUE, party1_approved_at = NOW(), 
                     status = CASE WHEN party2_approved OR proposed_by_party1 = FALSE THEN 'approved' ELSE status END,
                     updated_at = NOW() 
                     WHERE id = $1 RETURNING *`;
    } else {
      updateQuery = `UPDATE project_modifications SET party2_approved = TRUE, party2_approved_at = NOW(), 
                     status = CASE WHEN party1_approved OR proposed_by_party1 = TRUE THEN 'approved' ELSE status END,
                     updated_at = NOW() 
                     WHERE id = $1 RETURNING *`;
    }

    const result = await pool.query(updateQuery, [modification_id]);
    const updatedMod = result.rows[0];

    if (updatedMod.status === 'approved') {
      await applyModification(updatedMod, project);
    }

    res.json({ success: true, modification: updatedMod });
  } catch (error) {
    next(error);
  }
};

const applyModification = async (mod, project) => {
  try {
    if (mod.modification_type === 'project') {
      await pool.query(
        `UPDATE projects SET ${mod.field_name} = $1, updated_at = NOW() WHERE id = $2`,
        [mod.new_value, mod.project_id]
      );
    } else if (mod.modification_type === 'milestone') {
      await pool.query(
        `UPDATE milestones SET ${mod.field_name} = $1 WHERE id = $2`,
        [mod.new_value, mod.milestone_id]
      );
    } else if (mod.modification_type === 'milestone_create') {
      const data = JSON.parse(mod.new_value);
      await pool.query(
        `INSERT INTO milestones (project_id, title, description, deliverable_description, amount_ron, percentage_of_budget, deadline, order_number, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [mod.project_id, data.title, data.description, data.deliverable_description, data.amount_ron, data.percentage_of_budget, data.deadline, data.order_number]
      );
    } else if (mod.modification_type === 'milestone_delete') {
      await pool.query('DELETE FROM milestones WHERE id = $1', [mod.milestone_id]);
    }

    await pool.query(
      `UPDATE project_modifications SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [mod.id]
    );
  } catch (error) {
    console.error('Error applying modification:', error);
  }
};

export const rejectModification = async (req, res, next) => {
  try {
    const { modification_id } = req.params;
    const userId = req.user.id;

    const modResult = await pool.query('SELECT * FROM project_modifications WHERE id = $1', [modification_id]);
    if (modResult.rows.length === 0) {
      return res.status(404).json({ error: 'Modification not found' });
    }
    const mod = modResult.rows[0];

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [mod.project_id]);
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'Nu ești parte din acest proiect' });
    }

    await pool.query(
      `UPDATE project_modifications SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [modification_id]
    );

    res.json({ success: true, message: 'Modificare respinsă' });
  } catch (error) {
    next(error);
  }
};

export const getProjectModifications = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;
    const isParty = userId === party1Id || userId === party2Id;

    const result = await pool.query(
      `SELECT pm.*, u.name as proposed_by_name
       FROM project_modifications pm
       LEFT JOIN users u ON pm.proposed_by = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at DESC`,
      [project_id]
    );

    const modifications = result.rows.map(m => ({
      ...m,
      old_value: isParty ? m.old_value : null,
      new_value: isParty ? m.new_value : null
    }));

    res.json({ success: true, modifications });
  } catch (error) {
    next(error);
  }
};
