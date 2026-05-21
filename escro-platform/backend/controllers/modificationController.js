import pool from '../config/database.js';
import { sendEmailIfEnabled } from '../services/emailService.js';

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

    const signedContract = await pool.query(
      `SELECT id FROM contracts WHERE project_id = $1 AND contract_type = 'project' AND status = 'accepted'`,
      [project_id]
    );
    if (signedContract.rows.length > 0) {
      return res.status(400).json({ error: 'Nu se mai pot propune modificări după semnarea contractului de proiect' });
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

    const otherId = isParty1 ? party2Id : party1Id;
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'modification_proposed', 'Modificare propusă', $2, $3, NOW())`,
      [otherId, `O parte a propus modificarea câmpului „${field_name}" pe proiectul „${project.title}".`, `/project/${project_id}`]
    ).catch(e => console.warn('[bg]', e.message));
    sendEmailIfEnabled(pool, otherId, 'modificationProposed', {
      projectTitle: project.title,
      fieldOrMilestone: `câmpul „${field_name}"`,
      projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
    }).catch(e => console.warn('[bg]', e.message));

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

    const signedContract = await pool.query(
      `SELECT id FROM contracts WHERE project_id = $1 AND contract_type = 'project' AND status = 'accepted'`,
      [project_id]
    );
    if (signedContract.rows.length > 0) {
      return res.status(400).json({ error: 'Nu se mai pot propune modificări după semnarea contractului de proiect' });
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

    const otherId = isParty1 ? party2Id : party1Id;
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'modification_proposed', 'Modificare milestone propusă', $2, $3, NOW())`,
      [otherId, `O parte a propus modificarea milestone-ului „${milestone.title}".`, `/project/${project_id}`]
    ).catch(e => console.warn('[bg]', e.message));
    sendEmailIfEnabled(pool, otherId, 'modificationProposed', {
      projectTitle: project.title,
      fieldOrMilestone: `milestone-ul „${milestone.title}"`,
      projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
    }).catch(e => console.warn('[bg]', e.message));

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
      try {
        await applyModification(updatedMod, project);
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, link, created_at)
           VALUES ($1, 'modification_approved', 'Modificare acceptată', $2, $3, NOW())`,
          [mod.proposed_by, `Modificarea ta a fost acceptată pe proiectul „${project.title}".`, `/project/${mod.project_id}`]
        ).catch(e => console.warn('[bg]', e.message));
      } catch (applyErr) {
        // applyModification already marked as 'apply_failed'; surface error to admin/UI
        return res.status(400).json({
          success: false,
          modification: updatedMod,
          error: `Aprobat dar nu s-a putut aplica: ${applyErr.message}`
        });
      }
    }

    res.json({ success: true, modification: updatedMod });
  } catch (error) {
    next(error);
  }
};

// Whitelist of allowed fields per modification type — protects against SQL injection via field_name
const ALLOWED_PROJECT_FIELDS = new Set(['title', 'description', 'budget_ron', 'timeline_days', 'deadline']);
const ALLOWED_MILESTONE_FIELDS = new Set(['title', 'description', 'deliverable_description', 'amount_ron', 'percentage_of_budget', 'deadline', 'order_number']);

const coerceModificationValue = (fieldName, raw) => {
  // Numeric fields
  if (['budget_ron', 'amount_ron', 'percentage_of_budget'].includes(fieldName)) {
    const n = parseFloat(raw);
    if (isNaN(n)) throw new Error(`Valoare numerică invalidă pentru ${fieldName}: ${raw}`);
    return n;
  }
  if (['timeline_days', 'order_number'].includes(fieldName)) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) throw new Error(`Valoare întreagă invalidă pentru ${fieldName}: ${raw}`);
    return n;
  }
  if (fieldName === 'deadline') {
    const d = new Date(raw);
    if (isNaN(d.getTime())) throw new Error(`Dată invalidă pentru ${fieldName}: ${raw}`);
    return d;
  }
  return raw;
};

// Fields that cannot change once escrow holds money
const ESCROW_LOCKED_PROJECT_FIELDS = new Set(['budget_ron']);
const ESCROW_LOCKED_MILESTONE_FIELDS = new Set(['amount_ron', 'percentage_of_budget']);

const hasActiveEscrow = async (projectId) => {
  const r = await pool.query(
    `SELECT 1 FROM escrow_accounts WHERE project_id = $1 AND COALESCE(held_balance_ron, 0) > 0 LIMIT 1`,
    [projectId]
  );
  return r.rows.length > 0;
};

const applyModification = async (mod, project) => {
  try {
    if (mod.modification_type === 'project') {
      if (!ALLOWED_PROJECT_FIELDS.has(mod.field_name)) {
        throw new Error(`Câmp interzis pentru modificare proiect: ${mod.field_name}`);
      }
      // Block money fields if escrow active
      if (ESCROW_LOCKED_PROJECT_FIELDS.has(mod.field_name) && await hasActiveEscrow(mod.project_id)) {
        throw new Error(`Nu poți schimba ${mod.field_name} cât timp escrow-ul are fonduri active.`);
      }
      const value = coerceModificationValue(mod.field_name, mod.new_value);
      await pool.query(
        `UPDATE projects SET ${mod.field_name} = $1, updated_at = NOW() WHERE id = $2`,
        [value, mod.project_id]
      );
    } else if (mod.modification_type === 'milestone') {
      if (!ALLOWED_MILESTONE_FIELDS.has(mod.field_name)) {
        throw new Error(`Câmp interzis pentru modificare milestone: ${mod.field_name}`);
      }
      if (ESCROW_LOCKED_MILESTONE_FIELDS.has(mod.field_name) && await hasActiveEscrow(mod.project_id)) {
        throw new Error(`Nu poți schimba ${mod.field_name} cât timp escrow-ul are fonduri active.`);
      }
      const value = coerceModificationValue(mod.field_name, mod.new_value);
      await pool.query(
        `UPDATE milestones SET ${mod.field_name} = $1 WHERE id = $2`,
        [value, mod.milestone_id]
      );
    } else if (mod.modification_type === 'milestone_create') {
      if (await hasActiveEscrow(mod.project_id)) {
        throw new Error('Nu poți adăuga milestone cât timp escrow-ul are fonduri active.');
      }
      const data = JSON.parse(mod.new_value);
      await pool.query(
        `INSERT INTO milestones (project_id, title, description, deliverable_description, amount_ron, percentage_of_budget, deadline, order_number, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [mod.project_id, data.title, data.description, data.deliverable_description, data.amount_ron, data.percentage_of_budget, data.deadline, data.order_number]
      );
    } else if (mod.modification_type === 'milestone_delete') {
      if (await hasActiveEscrow(mod.project_id)) {
        throw new Error('Nu poți șterge milestone cât timp escrow-ul are fonduri active.');
      }
      await pool.query('DELETE FROM milestones WHERE id = $1', [mod.milestone_id]);
    }

    await pool.query(
      `UPDATE project_modifications SET status = 'applied', updated_at = NOW() WHERE id = $1`,
      [mod.id]
    );
  } catch (error) {
    // Mark as failed so it doesn't look approved-but-not-applied
    await pool.query(
      `UPDATE project_modifications SET status = 'apply_failed', updated_at = NOW() WHERE id = $1`,
      [mod.id]
    ).catch(() => {});
    console.error('Error applying modification:', error.message);
    throw error;
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

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'modification_rejected', 'Modificare respinsă', $2, $3, NOW())`,
      [mod.proposed_by, `Modificarea ta a fost respinsă pe proiectul „${project.title}".`, `/project/${mod.project_id}`]
    ).catch(e => console.warn('[bg]', e.message));

    res.json({ success: true, message: 'Modificare respinsă' });
  } catch (error) {
    next(error);
  }
};

export const getProjectModifications = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;
    const isParty = String(userId) === String(party1Id) || String(userId) === String(party2Id);

    // Block non-parties and non-admins entirely (don't even reveal existence)
    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT pm.*, u.name as proposed_by_name
       FROM project_modifications pm
       LEFT JOIN users u ON pm.proposed_by = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at DESC`,
      [project_id]
    );

    res.json({ success: true, modifications: result.rows });
  } catch (error) {
    next(error);
  }
};
