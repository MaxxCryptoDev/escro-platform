import pool from '../config/database.js';
import { generateContractPDF, generateFinalContractPDF } from '../services/contractPDF.js';
import { v4 as uuidv4 } from 'uuid';
import { canCancel } from '../utils/projectStatus.js';
import { logProjectHistory } from '../utils/projectHistory.js';
import { sendEmailIfEnabled } from '../services/emailService.js';

const generateContractNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ESC-${year}-${random}`;
};

const generateContractText = (project, party1, party2, milestones) => {
  const contractNumber = generateContractNumber();
  const contractDate = new Date().toISOString().split('T')[0];
  const endDate = project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : 'Conform calendarului proiectului';

  const milestonesTable = milestones.map((m, i) => `
Milestone ${i + 1}
Titlu: ${m.title}
Descriere: ${m.description || m.deliverable_description || 'N/A'}
Sumă: ${m.amount_ron} RON
Termen: ${m.deadline || 'Conform planificării'}
`).join('\n\n');

  return `CONTRACT DE COLABORARE COMERCIALĂ ȘI PRESTĂRI SERVICII

Nr. ${contractNumber} din data ${contractDate}

1. PĂRȚILE CONTRACTANTE

Prezentul contract („Contractul") se încheie între:

1.1. Beneficiarul

Denumire: ${party2?.company || party2?.name || 'N/A'}
Formă juridică: SRL
Sediu social: ${party2?.address || 'N/A'}
Nr. Registrul Comerțului: ${party2?.reg || 'N/A'}
CUI: ${party2?.cui || 'N/A'}
Reprezentant legal: ${party2?.name || 'N/A'}
Funcție: ${party2?.role === 'company' ? 'Reprezentant' : 'Beneficiar'}
Email: ${party2?.email || 'N/A'}

denumit în continuare „Beneficiarul"

și

1.2. Prestatorul

Denumire: ${party1?.company || party1?.name || 'N/A'}
Formă juridică: SRL
Sediu social: ${party1?.address || 'N/A'}
Nr. Registrul Comerțului: ${party1?.reg || 'N/A'}
CUI: ${party1?.cui || 'N/A'}
Reprezentant legal: ${party1?.name || 'N/A'}
Funcție: ${party1?.role === 'expert' ? 'Expert' : 'Prestator'}
Email: ${party1?.email || 'N/A'}

denumit în continuare „Prestatorul"

Beneficiarul și Prestatorul vor fi denumite individual „Partea" și împreună „Părțile".

2. OBIECTUL CONTRACTULUI

2.1. Obiectul prezentului Contract îl reprezintă furnizarea de către Prestator a serviciilor descrise în Task-ul înregistrat pe platforma ESCRO, cu următoarele detalii:

Titlu Task: ${project.title}

Descriere Task: ${project.description}

ID Task: ${project.id}

2.2. Serviciile vor fi executate conform specificațiilor, termenelor și etapelor definite în prezentul Contract și în Anexa 1 – Milestones.

3. VALOAREA CONTRACTULUI

3.1. Valoarea totală a Contractului este: ${project.budget_ron} RON

3.2. Plata se va realiza prin intermediul sistemului ESCRO, într-un cont de escrow securizat, administrat de platforma ESCRO.

3.3. Fondurile vor fi eliberate către Prestator exclusiv după îndeplinirea milestone-urilor și aprobarea acestora de către Beneficiar, conform Anexei 1.

4. SISTEMUL DE PLATĂ ESCRO

4.1. Beneficiarul va depune suma aferentă milestone-urilor în contul escrow înainte de începerea execuției serviciilor.

4.2. Fondurile vor fi eliberate către Prestator doar după:

- confirmarea îndeplinirii milestone-ului
- acceptarea explicită din partea Beneficiarului
- sau expirarea perioadei de contestare stabilită

4.3. Platforma ESCRO acționează ca intermediar tehnic și nu este parte contractuală în execuția serviciilor.

5. DURATA CONTRACTULUI

5.1. Contractul intră în vigoare la data semnării și rămâne valabil până la:

${endDate}

sau până la îndeplinirea integrală a obligațiilor.

6. OBLIGAȚIILE PRESTATORULUI

Prestatorul se obligă:
a) să execute serviciile conform descrierii
b) să respecte termenele milestone-urilor
c) să furnizeze rezultate conforme
d) să comunice progresul prin platforma ESCRO
e) să nu divulge informații confidențiale

7. OBLIGAȚIILE BENEFICIARULUI

Beneficiarul se obligă:
a) să furnizeze informațiile necesare
b) să depună fondurile în escrow
c) să analizeze și să aprobe milestone-urile
d) să nu întârzie aprobarea nejustificat

8. ACCEPTAREA MILESTONE-URILOR

8.1. După livrarea unui milestone, Beneficiarul are 7 zile pentru:

- acceptare
- solicitare modificări
- contestare

8.2. Lipsa răspunsului în termen se consideră acceptare automată.

9. CONFIDENȚIALITATE

9.1. Părțile se obligă să păstreze confidențialitatea tuturor informațiilor comerciale, tehnice și financiare.

9.2. Această obligație rămâne valabilă timp de 5 ani după încetarea Contractului.

10. RĂSPUNDEREA CONTRACTUALĂ

10.1. Prestatorul răspunde pentru execuția serviciilor.
10.2. Beneficiarul răspunde pentru plata sumelor.
10.3. Platforma ESCRO nu răspunde pentru calitatea serviciilor, ci doar pentru procesarea escrow.

11. ÎNCETAREA CONTRACTULUI

Contractul poate înceta prin:
a) îndeplinirea obligațiilor
b) acordul ambelor părți
c) imposibilitate de executare
d) reziliere pentru neexecutare

12. FORȚA MAJORĂ

Niciuna dintre părți nu răspunde pentru neexecutare cauzată de forță majoră.

13. LEGEA APLICABILĂ

Prezentul Contract este guvernat de legea din România.

Litigiile vor fi soluționate de instanțele competente.

14. SEMNĂTURI

Beneficiar
${party2?.company || party2?.name || 'N/A'}

Reprezentant: ${party2?.name || 'N/A'}

Semnătură: ___________

Data: ___________

Prestator
${party1?.company || party1?.name || 'N/A'}

Reprezentant: ${party1?.name || 'N/A'}

Semnătură: ___________

Data: ___________

ANEXA 1 – MILESTONES

${milestonesTable}
`;
};

const autoCreateContract = async (projectId) => {
  try {
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) return null;
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;
    
    if (!party1Id || !party2Id || party1Id === party2Id) return null;

    const existingContract = await pool.query(
      "SELECT id FROM contracts WHERE project_id = $1 AND contract_type = 'project'",
      [projectId]
    );
    if (existingContract.rows.length > 0) return existingContract.rows[0].id;

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number',
      [projectId]
    );

    const party1Result = await pool.query('SELECT * FROM users WHERE id = $1', [party1Id]);
    const party2Result = await pool.query('SELECT * FROM users WHERE id = $1', [party2Id]);

    const contractNumber = generateContractNumber();
    const contractText = generateContractText(
      project,
      party1Result.rows[0],
      party2Result.rows[0],
      milestonesResult.rows
    );
    
    let pdfUrl = null;
    try {
      pdfUrl = await generateContractPDF(
        { id: uuidv4(), contract_number: contractNumber, contract_date: new Date() },
        project,
        party1Result.rows[0],
        party2Result.rows[0],
        milestonesResult.rows
      );
    } catch (e) {
      console.log('[autoCreateContract] PDF generation failed:', e.message);
    }

    const result = await pool.query(
      `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date, pdf_url)
       VALUES ($1, 'project', $2, $3, $4, 'pending', $5, NOW(), $6)
       RETURNING id`,
      [projectId, party1Id, party2Id, contractText, contractNumber, pdfUrl]
    );

    console.log('[autoCreateContract] Contract created:', result.rows[0].id);
    return result.rows[0].id;
  } catch (error) {
    console.error('[autoCreateContract] Error:', error);
    return null;
  }
};

const autoCreateFinalContract = async (projectId) => {
  try {
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) return null;
    const project = projectResult.rows[0];

    const existingFinal = await pool.query(
      "SELECT id FROM contracts WHERE project_id = $1 AND contract_type = 'final'",
      [projectId]
    );
    if (existingFinal.rows.length > 0) return existingFinal.rows[0].id;

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    const party1Result = await pool.query('SELECT * FROM users WHERE id = $1', [party1Id]);
    const party2Result = await pool.query('SELECT * FROM users WHERE id = $1', [party2Id]);

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number',
      [projectId]
    );

    const escrowResult = await pool.query(
      'SELECT * FROM escrow_accounts WHERE project_id = $1',
      [projectId]
    );

    const contractNumber = generateContractNumber();
    const escrow = escrowResult.rows[0];

    const finalContractText = `
PROTOCOL DE FINALIZARE A PROIECTULUI

Nr. ${contractNumber} din data ${new Date().toISOString().split('T')[0]}

1. PĂRȚILE

1.1. Beneficiar: ${party2Result.rows[0]?.company || party2Result.rows[0]?.name || 'N/A'}
      Reprezentant: ${party2Result.rows[0]?.name || 'N/A'}
      Email: ${party2Result.rows[0]?.email || 'N/A'}

1.2. Prestator: ${party1Result.rows[0]?.company || party1Result.rows[0]?.name || 'N/A'}
      Reprezentant: ${party1Result.rows[0]?.name || 'N/A'}
      Email: ${party1Result.rows[0]?.email || 'N/A'}

2. OBIECTUL

2.1. Prezentul Protocol confirmă finalizarea proiectului:
     Titlu: ${project.title}
     ID: ${project.id}

2.2. Toate milestone-urile au fost finalizate și aprobate de ambele părți.

3. SITUAȚIA FINANCIARĂ

3.1. Valoarea totală a proiectului: ${project.budget_ron} RON

3.2. Suma eliberată către Prestator: ${escrow?.released_to_expert_total_ron || 0} RON

3.3. Comision platformă (ESCRO): ${escrow?.claudiu_earned_total_ron || 0} RON

4. CONFIRMAREA FINALIZĂRII

4.1. Ambele părți confirmă că:
     - Serviciile au fost executate conform specificațiilor
     - Toate deliverabilele au fost livrate și acceptate
     - Nu există obiecții sau pretenții rămase nerezolvate
     - Proiectul este finalizat cu succes

5. SEMNĂTURI

Beneficiar: _______________  Data: ___________

Prestator: _______________  Data: ___________
`.trim();
    
    let pdfUrl = null;
    try {
      pdfUrl = await generateFinalContractPDF(
        { id: uuidv4(), contract_number: contractNumber, contract_date: new Date() },
        project,
        party1Result.rows[0],
        party2Result.rows[0],
        milestonesResult.rows,
        escrowResult.rows[0]
      );
    } catch (e) {
      console.log('[autoCreateFinalContract] PDF generation failed:', e.message);
    }

    const result = await pool.query(
      `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date, pdf_url)
       VALUES ($1, 'final', $2, $3, $4, 'pending', $5, NOW(), $6)
       RETURNING id`,
      [projectId, party1Id, party2Id, finalContractText, contractNumber, pdfUrl]
    );

    console.log('[autoCreateFinalContract] Final contract created:', result.rows[0].id);
    return result.rows[0].id;
  } catch (error) {
    console.error('[autoCreateFinalContract] Error:', error);
    return null;
  }
};

export { autoCreateContract, autoCreateFinalContract };

export const createProject = async (req, res, next) => {
  try {
    const { title, description, budget_ron, timeline_days, milestones, service_type, direct_partner_email, task_id: incoming_task_id } = req.body;
    const client_id = req.user.id;

    // Only non-admin users need admin approval before creating projects
    if (req.user.role !== 'admin') {
      const userCheck = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [client_id]);
      if (userCheck.rows.length === 0 || userCheck.rows[0].kyc_status !== 'verified') {
        return res.status(403).json({ error: 'Contul tău nu a fost aprobat de admin. Trebuie să fii verificat pentru a crea proiecte.' });
      }
    }

    let task_id = incoming_task_id || null;

    if (!title || !description || budget_ron === undefined || budget_ron === null) {
      console.log('[createProject] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: title, description, budget_ron' });
    }

    // Skip milestone validation for project_management (tasks don't need milestones upfront)
    if (service_type !== 'project_management') {
      if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
        console.log('[createProject] Invalid milestones:', milestones);
        return res.status(400).json({ error: 'At least one milestone is required' });
      }
      const totalPercentage = milestones.reduce((sum, m) => sum + (parseFloat(m.percentage_of_budget) || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({ error: `Procentele milestone-urilor trebuie să sumeze 100%. Suma curentă: ${totalPercentage.toFixed(2)}%` });
      }
    }

    const safeServiceType = service_type || 'matching';
    let initialStatus = 'pending_admin_approval';
    let expert_id = null;
    let company_id = null;
    let commissionPercent = 10;

    // For direct service, assign directly and skip admin approval
    if (safeServiceType === 'direct') {
      if (!direct_partner_email) {
        return res.status(400).json({ error: 'Email is required for direct service' });
      }

      // Find user by email
      const userResult = await pool.query(
        'SELECT id, role FROM users WHERE email = $1',
        [direct_partner_email]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found with this email' });
      }

      const partner = userResult.rows[0];

      if (partner.role === 'expert') {
        expert_id = partner.id;
      } else if (partner.role === 'company') {
        company_id = partner.id;
      } else {
        return res.status(400).json({ error: 'Doar experții și companiile pot fi prestatori. Userul cu email-ul indicat are alt rol.' });
      }

      // Direct projects skip admin approval, but still require explicit prestator acceptance
      initialStatus = 'pending_expert_approval';
      commissionPercent = 5;
    }

    // For project_management service, create only the Task (pending approval)
    if (safeServiceType === 'project_management') {
      // Create the parent Task - starts in pending_admin_approval status
      const taskResult = await pool.query(
        `INSERT INTO tasks (client_id, title, description, budget_ron, timeline_days, status, created_at, deadline)
         VALUES ($1, $2, $3, $4, $5, 'pending_admin_approval', NOW(), NOW() + make_interval(days => $5::int))
         RETURNING id`,
        [client_id, title, description, budget_ron, timeline_days || 30]
      );
      task_id = taskResult.rows[0].id;
      
      console.log('[createProject] PM Task created with ID:', task_id, 'status: pending_admin_approval');
      
      return res.status(201).json({
        success: true,
        task_id,
        is_project_management: true,
        message: 'Project Management task creat și trimis la aprobare!'
      });
    }

    const projectResult = await pool.query(
      `INSERT INTO projects (client_id, expert_id, company_id, task_id, title, description, budget_ron, timeline_days, status, service_type, commission_percent, assignment_type, created_at, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW() + make_interval(days => $8::int))
       RETURNING id`,
      [client_id, expert_id, company_id, task_id, title, description, budget_ron, timeline_days, initialStatus, safeServiceType, commissionPercent, task_id ? 'task_assignment' : 'standalone']
    );

    const project_id = projectResult.rows[0].id;
    console.log('[createProject] Project created with ID:', project_id);

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

    let message = 'Project created with milestones';
    if (safeServiceType === 'direct') {
      message = 'Project created — partner notified, awaiting acceptance';
    }
    if (safeServiceType === 'project_management') {
      message = 'Project Management task created - you can add assignments from Project Management dashboard';
    }

    // For direct-service, notify the prestator that they must explicitly accept the task
    if (safeServiceType === 'direct') {
      const prestatorId = expert_id || company_id;
      const directLink = `/project/${project_id}`;
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_acceptance_required', 'Task direct de acceptat', $2, $3, NOW())`,
        [
          prestatorId,
          `Clientul te-a invitat direct pe "${title}". Verifică detaliile și acceptă pentru a demara colaborarea.`,
          directLink
        ]
      ).catch(e => console.warn('[bg notification]', e.message));
      sendEmailIfEnabled(pool, prestatorId, 'taskAcceptanceRequired', {
        projectTitle: title,
        projectUrl: `${process.env.FRONTEND_URL}${directLink}`,
        invitationMessage: `Clientul te-a invitat direct pe proiectul <strong>"${title}"</strong>.`,
      }).catch(e => console.warn('[bg email]', e.message));
    }

    res.status(201).json({
      success: true,
      project_id,
      task_id,
      message,
      is_project_management: safeServiceType === 'project_management'
    });
  } catch (error) {
    console.error('ERROR in createProject:', error.message);
    console.error('Stack:', error.stack);
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;


    // First get regular projects — global ecosystem view: any authenticated user reads any
    // non-cancelled project. Admin gets everything (no WHERE).
    let whereClause = '';

    if (userRole === 'admin') {
      whereClause = '';
    } else {
      // Global ecosystem view: any authenticated user sees any non-cancelled / non-rejected
      // project. Marketplace bucket vs Proiecte & Taskuri bucket is decided on the frontend
      // (pending_assignment → marketplace, everything else → dashboard). Sensitive fields
      // (escrow_amount, milestones internals) are still party-scoped on the project detail.
      whereClause = `WHERE p.status NOT IN ('cancelled', 'rejected')
      AND (p.task_id IS NULL OR t.status != 'cancelled')`;
      // No params needed for the WHERE clause anymore — only the contracts subquery binds userId.
    }

    // Contracts subquery binds userId (for "pending_contracts_for_me"); it's always the first param.
    const contractParamIdx = 1;
    const result = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.company_id, p.task_id, p.assignment_type, p.title, p.description, p.budget_ron, p.timeline_days, p.status, p.deadline, p.created_at, p.updated_at, p.posted_by_expert, p.posted_by_client, p.expert_posting_status, p.client_posting_status, p.service_type, p.commission_percent, t.title as task_title, t.description as task_description, t.budget_ron as task_budget, t.timeline_days as task_timeline, u.name as client_name, u.email as client_email, u.company as client_company, u.phone as client_phone, u.profile_image_url as client_profile_image_url, u.bio as client_bio, u.industry as client_industry, u.expertise as client_profession, u.experience as client_experience_years, u.cui as client_cui, e.name as expert_name, e.email as expert_email, e.company as expert_company, e.expertise as expert_expertise, e.industry as expert_industry, e.experience as expert_experience_years, e.bio as expert_bio, e.phone as expert_phone, e.profile_image_url as expert_profile_image_url, e.portfolio_description as expert_portfolio_description, e.cui as expert_cui, c.name as company_name, c.company as company_company_name, c.email as company_email, c.phone as company_phone, c.profile_image_url as company_profile_image_url, c.bio as company_bio, c.industry as company_industry, c.expertise as company_expertise, c.experience as company_experience_years, c.cui as company_cui,
              COALESCE((SELECT COUNT(*) FROM contracts ct WHERE ct.project_id = p.id AND ct.status = 'pending' AND ((ct.party1_id = $${contractParamIdx} AND ct.party1_accepted = false) OR (ct.party2_id = $${contractParamIdx} AND ct.party2_accepted = false))), 0) as pending_contracts_for_me,
              COALESCE((SELECT COUNT(*) FROM milestones ms WHERE ms.project_id = p.id AND ms.status IN ('in_progress', 'revision_requested')), 0) as pending_deliveries,
              COALESCE((SELECT COUNT(*) FROM milestones ms WHERE ms.project_id = p.id AND ms.status = 'delivered'), 0) as pending_approvals,
              COALESCE((SELECT COUNT(*) FROM project_modifications pm
                WHERE pm.project_id = p.id
                  AND pm.status = 'pending'
                  AND pm.proposed_by != $${contractParamIdx}
                  AND ((($${contractParamIdx} = COALESCE(p.expert_id, p.company_id)) AND pm.party1_approved = FALSE)
                    OR (($${contractParamIdx} = p.client_id) AND pm.party2_approved = FALSE))
              ), 0) as pending_modifications_for_me,
              COALESCE((SELECT COUNT(*) FROM milestones ms WHERE ms.project_id = p.id AND ms.status IN ('approved','released')), 0) as milestones_done,
              COALESCE((SELECT COUNT(*) FROM milestones ms WHERE ms.project_id = p.id), 0) as milestones_total,
              CASE WHEN p.status = 'completed' THEN 100
                   WHEN COALESCE(p.budget_ron, 0) = 0 THEN 0
                   ELSE LEAST(100, ROUND(
                     COALESCE((SELECT SUM(ms.amount_ron) FROM milestones ms WHERE ms.project_id = p.id AND ms.status IN ('approved','released')), 0)
                     / p.budget_ron * 100
                   ))
              END as progress
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       LEFT JOIN tasks t ON p.task_id = t.id
       ${whereClause}
       ORDER BY p.created_at DESC`,
      [userId]
    );

    if (result.rows.length > 0) {
    }

    // Also get PM tasks (from tasks table)

    // Also get PM tasks (from tasks table)
    let pmTasks = [];
    if (userRole === 'expert') {
      // Expert: show only open/in_progress tasks (not pending approval)
      const tasksQuery = `
        SELECT t.id, t.client_id, NULL as expert_id, NULL as company_id, t.id as task_id, 'pm_task' as assignment_type, 
               t.title, t.description, t.budget_ron, t.timeline_days, 
               t.status as status,
               t.created_at, t.updated_at,
               NULL as posted_by_expert, NULL as posted_by_client, NULL as expert_posting_status, NULL as client_posting_status,
               'project_management' as service_type, 10 as commission_percent,
               t.title as task_title, t.description as task_description, t.budget_ron as task_budget, t.timeline_days as task_timeline,
               u.name as client_name, u.email as client_email, u.company as client_company, u.phone as client_phone, 
               u.profile_image_url as client_profile_image_url, u.bio as client_bio, u.industry as client_industry, 
               u.expertise as client_profession, u.experience as client_experience_years, u.cui as client_cui,
               NULL as expert_name, NULL as expert_email, NULL as expert_company, NULL as expert_expertise, 
               NULL as expert_industry, NULL as expert_experience_years, NULL as expert_bio, NULL as expert_phone, 
               NULL as expert_profile_image_url, NULL as expert_portfolio_description, NULL as expert_cui,
               NULL as company_name, NULL as company_company_name, NULL as company_email, NULL as company_phone, 
               NULL as company_profile_image_url, NULL as company_bio, NULL as company_industry, 
               NULL as company_expertise, NULL as company_experience_years, NULL as company_cui,
               true as is_pm_task,
               0 as pending_contracts_for_me, 0 as pending_deliveries, 0 as pending_approvals, 0 as pending_modifications_for_me,
               COALESCE((SELECT COUNT(*) FROM milestones ms JOIN projects sp ON ms.project_id = sp.id WHERE sp.task_id = t.id AND ms.status IN ('approved','released')), 0) as milestones_done,
               COALESCE((SELECT COUNT(*) FROM milestones ms JOIN projects sp ON ms.project_id = sp.id WHERE sp.task_id = t.id), 0) as milestones_total,
               CASE WHEN t.status = 'completed' THEN 100
                    WHEN COALESCE(t.budget_ron, 0) = 0 THEN 0
                    ELSE LEAST(100, ROUND(COALESCE((SELECT SUM(ms.amount_ron) FROM milestones ms JOIN projects sp ON ms.project_id = sp.id WHERE sp.task_id = t.id AND ms.status IN ('approved','released')), 0) / t.budget_ron * 100))
               END as progress,
               COALESCE(
                  (SELECT JSON_AGG(
                    CASE
                      WHEN pa.expert_id IS NOT NULL THEN JSON_BUILD_OBJECT('name', ue.name, 'id', ue.id, 'type', 'expert')
                      WHEN pa.company_id IS NOT NULL THEN JSON_BUILD_OBJECT('name', uc.name, 'id', uc.id, 'type', 'company')
                    END
                  )
                  FROM projects pa
                  LEFT JOIN users ue ON pa.expert_id = ue.id
                  LEFT JOIN users uc ON pa.company_id = uc.id
                  WHERE pa.task_id = t.id AND (pa.expert_id IS NOT NULL OR pa.company_id IS NOT NULL)),
                  '[]'::json
                 ) as assigned_experts
         FROM tasks t
         LEFT JOIN users u ON t.client_id = u.id
         WHERE t.status NOT IN ('cancelled')
         ORDER BY t.created_at DESC
       `;
       const tasksResult = await pool.query(tasksQuery);
       pmTasks = tasksResult.rows;
    } else if (userRole === 'company' || userRole === 'individual') {
      const tasksQuery = `
        SELECT t.id, t.client_id, NULL as expert_id, NULL as company_id, t.id as task_id, 'pm_task' as assignment_type, 
               t.title, t.description, t.budget_ron, t.timeline_days, 
               t.status as status,
               t.created_at, t.updated_at,
               NULL as posted_by_expert, NULL as posted_by_client, NULL as expert_posting_status, NULL as client_posting_status,
               'project_management' as service_type, 10 as commission_percent,
               t.title as task_title, t.description as task_description, t.budget_ron as task_budget, t.timeline_days as task_timeline,
               u.name as client_name, u.email as client_email, u.company as client_company, u.phone as client_phone, 
               u.profile_image_url as client_profile_image_url, u.bio as client_bio, u.industry as client_industry, 
               u.expertise as client_profession, u.experience as client_experience_years, u.cui as client_cui,
               NULL as expert_name, NULL as expert_email, NULL as expert_company, NULL as expert_expertise, 
               NULL as expert_industry, NULL as expert_experience_years, NULL as expert_bio, NULL as expert_phone, 
               NULL as expert_profile_image_url, NULL as expert_portfolio_description, NULL as expert_cui,
               NULL as company_name, NULL as company_company_name, NULL as company_email, NULL as company_phone, 
               NULL as company_profile_image_url, NULL as company_bio, NULL as company_industry, 
              NULL as company_expertise, NULL as company_experience_years, NULL as company_cui,
              true as is_pm_task,
              0 as pending_contracts_for_me, 0 as pending_deliveries, 0 as pending_approvals, 0 as pending_modifications_for_me,
              COALESCE((SELECT COUNT(*) FROM milestones ms JOIN projects sp ON ms.project_id = sp.id WHERE sp.task_id = t.id AND ms.status IN ('approved','released')), 0) as milestones_done,
              COALESCE((SELECT COUNT(*) FROM milestones ms JOIN projects sp ON ms.project_id = sp.id WHERE sp.task_id = t.id), 0) as milestones_total,
              CASE WHEN t.status = 'completed' THEN 100
                   WHEN COALESCE(t.budget_ron, 0) = 0 THEN 0
                   ELSE LEAST(100, ROUND(COALESCE((SELECT SUM(ms.amount_ron) FROM milestones ms JOIN projects sp ON ms.project_id = sp.id WHERE sp.task_id = t.id AND ms.status IN ('approved','released')), 0) / t.budget_ron * 100))
              END as progress,
              COALESCE(
                (SELECT JSON_AGG(
                  CASE
                    WHEN pa.expert_id IS NOT NULL THEN JSON_BUILD_OBJECT('name', ue.name, 'id', ue.id, 'type', 'expert')
                    WHEN pa.company_id IS NOT NULL THEN JSON_BUILD_OBJECT('name', uc.name, 'id', uc.id, 'type', 'company')
                  END
                )
                FROM projects pa
                LEFT JOIN users ue ON pa.expert_id = ue.id
                LEFT JOIN users uc ON pa.company_id = uc.id
                WHERE pa.task_id = t.id AND (pa.expert_id IS NOT NULL OR pa.company_id IS NOT NULL)),
                '[]'::json
               ) as assigned_experts
      FROM tasks t
      LEFT JOIN users u ON t.client_id = u.id
      WHERE t.status NOT IN ('cancelled')
      ORDER BY t.created_at DESC
    `;
    const tasksResult = await pool.query(tasksQuery);
    pmTasks = tasksResult.rows;
  }

  // Combine approved projects and approved PM tasks
    const allProjects = [...result.rows, ...pmTasks];
    
    // Batch-fetch milestones and escrow for all real projects (avoids N+1)
    const realProjectIds = allProjects.filter(p => !p.is_pm_task).map(p => p.id);
    const [milestoneBatch, escrowBatch] = realProjectIds.length > 0
      ? await Promise.all([
          pool.query('SELECT * FROM milestones WHERE project_id = ANY($1::uuid[]) ORDER BY order_number ASC', [realProjectIds]),
          pool.query('SELECT DISTINCT ON (project_id) project_id, held_balance_ron, released_to_expert_total_ron FROM escrow_accounts WHERE project_id = ANY($1::uuid[])', [realProjectIds]),
        ])
      : [{ rows: [] }, { rows: [] }];

    const milestonesByProject = {};
    for (const m of milestoneBatch.rows) {
      if (!milestonesByProject[m.project_id]) milestonesByProject[m.project_id] = [];
      milestonesByProject[m.project_id].push(m);
    }
    const escrowByProject = {};
    for (const e of escrowBatch.rows) escrowByProject[e.project_id] = e;

    const projectsWithMilestones = allProjects.map(project => {
      // Marketplace bucket = anything still pending (no actual work yet). A PM that has ANY
      // pending sub-task surfaces on Marketplace; it moves to "Proiecte & Taskuri" only when
      // a sub-task transitions to a worked-on state (assigned / in_progress / completed / etc.).
      // The prestator may or may not be set — admin-created tasks can pre-assign a prestator
      // and still wait for client/expert approval, so we don't gate on expert_id/company_id.
      const PENDING_STATUSES = ['open', 'pending_assignment', 'pending_admin_approval', 'pending_client_approval', 'pending_expert_approval'];
      const isMarketplace = !project.is_pm_task && PENDING_STATUSES.includes(project.status);

      if (project.is_pm_task) return { ...project, milestones: [], is_marketplace: false };
      const escrow = escrowByProject[project.id] || {};
      return {
        ...project,
        is_marketplace: isMarketplace,
        milestones: milestonesByProject[project.id] || [],
        escrow_amount: parseFloat(escrow.held_balance_ron) || 0,
        released_amount: parseFloat(escrow.released_to_expert_total_ron) || 0,
      };
    });


    res.json({
      success: true,
      projects: projectsWithMilestones
    });
  } catch (error) {
    console.error('[getProjects] error:', error);
    next(error);
  }
};

export const getProjectDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;


    // First check if it's a task (PM task)
    const taskResult = await pool.query(
      `SELECT t.*, u.name as client_name, u.email as client_email, u.company as client_company, 
              u.profile_image_url as client_profile_image_url, u.phone as client_phone,
              u.bio as client_bio, u.industry as client_industry, u.expertise as client_profession
       FROM tasks t
       LEFT JOIN users u ON t.client_id = u.id
       WHERE t.id = $1`,
      [id]
    );

    // If it's a task, return task data as a project-like response
    if (taskResult.rows.length > 0) {
      const task = taskResult.rows[0];

      const isCreator = userId && String(task.client_id) === String(userId);
      const isAdmin = req.user?.role === 'admin';

      // Cancelled tasks are admin-only
      if (task.status === 'cancelled' && !isAdmin) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check if user is assigned to any sub-assignment of this task (used for fine-grained
      // capabilities like can_view_sensitive — read access itself is open to any auth user).
      const assignedRes = userId ? await pool.query(
        `SELECT 1 FROM projects WHERE task_id = $1 AND assignment_type = 'task_assignment'
           AND (expert_id = $2 OR company_id = $2) LIMIT 1`,
        [id, userId]
      ) : { rows: [] };
      const isAssigned = assignedRes.rows.length > 0;

      // Global ecosystem view: any authenticated user can read any non-cancelled task.
      // Sensitive capabilities (edit, deliver, approve) still depend on party flags below.
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const taskAssignmentsResult = await pool.query(
        `SELECT p.id, p.title, p.description, p.budget_ron, p.status, p.service_type, p.created_at,
                p.expert_id, p.company_id,
                e.name as expert_name, e.profile_image_url as expert_profile_image_url,
                c.name as company_name, c.profile_image_url as company_profile_image_url
         FROM projects p
         LEFT JOIN users e ON p.expert_id = e.id
         LEFT JOIN users c ON p.company_id = c.id
         WHERE p.task_id = $1 AND p.assignment_type = 'task_assignment'
         ORDER BY p.created_at DESC`,
        [id]
      );

      return res.json({
        success: true,
        project: {
          ...task,
          is_pm_task: true,
          is_creator: isCreator,
          is_owner: isCreator,
          is_assigned_expert: false,
          is_assigned_company: false,
          can_view_sensitive: isCreator,
        },
        milestones: [],
        assignments: taskAssignmentsResult.rows
      });
    }

    // Otherwise, check projects table
    const projectResult = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.company_id, p.task_id, p.assignment_type, p.service_type, p.title, p.description, p.budget_ron, p.timeline_days, p.status, p.deadline, p.created_at, p.updated_at, p.posted_by_expert, p.posted_by_client, p.expert_posting_status, p.client_posting_status, p.rejection_reason, p.last_user_feedback, u.name as client_name, u.email as client_email, u.company as client_company, u.phone as client_phone, u.profile_image_url as client_profile_image_url, u.bio as client_bio, u.industry as client_industry, u.expertise as client_profession, u.experience as client_experience_years, u.cui as client_cui, e.name as expert_name, e.email as expert_email, e.company as expert_company, e.expertise as expert_expertise, e.industry as expert_industry, e.experience as expert_experience_years, e.bio as expert_bio, e.phone as expert_phone, e.profile_image_url as expert_profile_image_url, e.portfolio_description as expert_portfolio_description, e.kyc_status as expert_kyc_status, e.cui as expert_cui, c.name as company_name, c.company as company_company_name, c.email as company_email, c.profile_image_url as company_profile_image_url, c.phone as company_phone, c.bio as company_bio, c.industry as company_industry, c.expertise as company_expertise, c.experience as company_experience_years, c.cui as company_cui
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];
    

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number ASC',
      [id]
    );

    // Get assignments for PM tasks
    let assignments = [];
    if (project.task_id || project.assignment_type === 'pm_task') {
      const taskId = project.task_id || project.id;
      const assignmentsResult = await pool.query(
        `SELECT p.id, p.title, p.description, p.budget_ron, p.status, p.created_at, p.expert_id,
                e.name as expert_name, e.profile_image_url as expert_profile_image_url, 
                e.expertise as expert_expertise, e.industry as expert_industry
         FROM projects p
         LEFT JOIN users e ON p.expert_id = e.id
         WHERE p.task_id = $1 AND p.assignment_type = 'task_assignment'
         ORDER BY p.created_at DESC`,
        [taskId]
      );
      assignments = assignmentsResult.rows;
    }

    // Check if user is the creator (client) or assigned expert or assigned company
    const isCreator = userId && String(project.client_id) === String(userId);
    const isAssignedExpert = userId && String(project.expert_id) === String(userId);
    const isAssignedCompany = userId && String(project.company_id) === String(userId);
    const isPostedByExpert = userId && String(project.posted_by_expert) === String(userId);
    const isPostedByClient = userId && String(project.posted_by_client) === String(userId);
    // is_owner = anyone who originally created/owns the project (expert poster, client poster, or beneficiar)
    const isOwner = isCreator || isPostedByExpert || isPostedByClient;
    const isAdmin = req.user?.role === 'admin';

    // Global ecosystem view: any authenticated user can read any non-cancelled project.
    // Mutations (edit, deliver, approve, sign) still check party flags inside their respective
    // controllers; this guard only protects the read endpoint.
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (project.status === 'cancelled' && !isAdmin) {
      return res.status(404).json({ message: 'Project not found' });
    }


    // last_user_feedback is private (user's rejection note to admin) — strip for non-admins
    const { last_user_feedback, ...projectFiltered } = project;
    const responseProject = {
      ...projectFiltered,
      ...(isAdmin ? { last_user_feedback } : {}),
      is_creator: isCreator,
      is_owner: isOwner,
      is_assigned_expert: isAssignedExpert,
      is_assigned_company: isAssignedCompany,
      can_view_sensitive: isOwner || isAssignedExpert || isAssignedCompany
    };

    res.json({
      success: true,
      project: responseProject,
      milestones: milestonesResult.rows,
      assignments: assignments
    });
  } catch (error) {
    console.error('[ERROR getProjectDetail]:', error);
    next(error);
  }
};

export const addMilestones = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { milestones } = req.body;

    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({ error: 'At least one milestone is required' });
    }

    // Get project to know budget
    const projectResult = await pool.query('SELECT budget_ron FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const budget_ron = projectResult.rows[0].budget_ron;

    // Add milestones
    for (let index = 0; index < milestones.length; index++) {
      const milestone = milestones[index];
      await pool.query(
        `INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          projectId,
          index + 1,
          milestone.title,
          milestone.title,
          milestone.deliverable_description,
          milestone.percentage_of_budget,
          Math.round((budget_ron * milestone.percentage_of_budget) / 100 * 100) / 100,
          'pending'
        ]
      );
    }

    res.json({
      success: true,
      message: 'Milestones added successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const assignUserToProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { expert_id, company_id, action } = req.body;
    const admin_id = req.user.id;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can assign users to projects' });
    }

    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Prevent self-dealing: project owner cannot be assigned as expert or company
    if (action === 'assign_expert' && expert_id && String(expert_id) === String(project.client_id)) {
      return res.status(400).json({ error: 'Proprietarul proiectului nu poate fi asignat ca expert' });
    }
    if (action === 'assign_company' && company_id && String(company_id) === String(project.client_id)) {
      return res.status(400).json({ error: 'Proprietarul proiectului nu poate fi asignat ca partener' });
    }

    let updateFields = [];
    let updateValues = [];
    let paramCount = 1;

    if (action === 'assign_expert' && expert_id) {
      updateFields.push(`expert_id = $${paramCount++}`);
      updateValues.push(expert_id);
      updateFields.push(`company_id = $${paramCount++}`);
      updateValues.push(null);
    } else if (action === 'assign_company' && company_id) {
      updateFields.push(`company_id = $${paramCount++}`);
      updateValues.push(company_id);
      updateFields.push(`expert_id = $${paramCount++}`);
      updateValues.push(null);
    } else if (action === 'unassign') {
      updateFields.push(`expert_id = $${paramCount++}`);
      updateValues.push(null);
      updateFields.push(`company_id = $${paramCount++}`);
      updateValues.push(null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid assignment action provided' });
    }

    updateFields.push(`status = $${paramCount++}`);
    updateValues.push(action === 'unassign' ? 'open' : 'in_progress');
    updateValues.push(projectId);

    const query = `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await pool.query(query, updateValues);

    // If assigning expert or company, auto-create contract
    if ((action === 'assign_expert' || action === 'assign_company') && (expert_id || company_id)) {
      await autoCreateContract(projectId);
    }

    // If this is a task_assignment (collaboration), also update the PM parent task to in_progress
    const projectCheck = await pool.query(
      `SELECT task_id FROM projects WHERE id = $1`,
      [projectId]
    );
    
    if (projectCheck.rows.length > 0 && projectCheck.rows[0].task_id) {
      await pool.query(
        `UPDATE tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [projectCheck.rows[0].task_id]
      );
    }

    res.json({
      success: true,
      project: result.rows[0],
      message: action === 'unassign' ? 'User unassigned from project' : 'User assigned to project successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivity = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT * FROM (
        -- Milestone delivered by expert
        SELECT
          'milestone_delivered' AS event_type,
          m.title AS milestone_title,
          p.title AS project_title,
          p.id AS project_id,
          u.name AS actor_name,
          m.amount_ron AS amount,
          m.delivered_at AS event_time,
          NULL::uuid AS task_id
        FROM milestones m
        JOIN projects p ON m.project_id = p.id
        JOIN users u ON p.expert_id = u.id
        WHERE m.delivered_at IS NOT NULL
          AND (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)

        UNION ALL

        -- Milestone approved
        SELECT
          'milestone_approved' AS event_type,
          m.title AS milestone_title,
          p.title AS project_title,
          p.id AS project_id,
          u.name AS actor_name,
          m.amount_ron AS amount,
          m.approved_at AS event_time,
          NULL::uuid AS task_id
        FROM milestones m
        JOIN projects p ON m.project_id = p.id
        JOIN users u ON COALESCE(p.company_id, p.client_id) = u.id
        WHERE m.approved_at IS NOT NULL
          AND (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)

        UNION ALL

        -- Funds released (milestone_releases)
        SELECT
          'funds_released' AS event_type,
          m.title AS milestone_title,
          p.title AS project_title,
          p.id AS project_id,
          u.name AS actor_name,
          mr.expert_amount_ron AS amount,
          mr.released_at AS event_time,
          NULL::uuid AS task_id
        FROM milestone_releases mr
        JOIN escrow_accounts ea ON mr.escrow_id = ea.id
        JOIN projects p ON ea.project_id = p.id
        JOIN milestones m ON mr.milestone_id = m.id
        JOIN users u ON COALESCE(p.company_id, p.client_id) = u.id
        WHERE (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)

        UNION ALL

        -- Escrow deposit
        SELECT
          'escrow_deposit' AS event_type,
          NULL AS milestone_title,
          p.title AS project_title,
          p.id AS project_id,
          u.name AS actor_name,
          ea.total_amount_ron AS amount,
          ea.created_at AS event_time,
          NULL::uuid AS task_id
        FROM escrow_accounts ea
        JOIN projects p ON ea.project_id = p.id
        JOIN users u ON p.client_id = u.id
        WHERE (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)

        UNION ALL

        -- Project completed
        SELECT
          'project_completed' AS event_type,
          NULL AS milestone_title,
          p.title AS project_title,
          p.id AS project_id,
          u.name AS actor_name,
          p.budget_ron AS amount,
          p.completed_at AS event_time,
          NULL::uuid AS task_id
        FROM projects p
        JOIN users u ON COALESCE(p.company_id, p.client_id) = u.id
        WHERE p.status = 'completed' AND p.completed_at IS NOT NULL
          AND (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)

        UNION ALL

        -- Recent messages (max 5, only from others)
        SELECT
          'message_sent' AS event_type,
          NULL AS milestone_title,
          p.title AS project_title,
          p.id AS project_id,
          u.name AS actor_name,
          NULL AS amount,
          msg.created_at AS event_time,
          NULL::uuid AS task_id
        FROM (
          SELECT DISTINCT ON (project_id) *
          FROM messages
          WHERE sender_id != $1
          ORDER BY project_id, created_at DESC
        ) msg
        JOIN projects p ON msg.project_id = p.id
        JOIN users u ON msg.sender_id = u.id
        WHERE (p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1)

        UNION ALL

        -- Project created by user (task_id included for task assignments)
        SELECT
          'project_created' AS event_type,
          NULL AS milestone_title,
          p.title AS project_title,
          p.id AS project_id,
          NULL AS actor_name,
          p.budget_ron AS amount,
          p.created_at AS event_time,
          p.task_id AS task_id
        FROM projects p
        WHERE (p.client_id = $1 OR p.posted_by_expert = $1 OR p.posted_by_client = $1)
          AND p.status != 'pending_admin_approval'

        UNION ALL

        -- Notifications (assignment, approval, rejection events)
        SELECT
          n.type AS event_type,
          NULL AS milestone_title,
          COALESCE(p.title, n.title) AS project_title,
          p.id AS project_id,
          'Admin' AS actor_name,
          NULL AS amount,
          n.created_at AS event_time,
          NULL::uuid AS task_id
        FROM notifications n
        LEFT JOIN projects p ON (
          n.link LIKE '/project/%' AND
          p.id = (REGEXP_MATCH(n.link, '/project/([0-9a-f-]{36})'))[1]::uuid
        )
        WHERE n.user_id = $1
          AND n.type IN (
            'expert_assigned', 'company_assigned', 'task_assigned',
            'project_approved', 'project_rejected',
            'account_approved', 'account_rejected',
            'admin_edit', 'expert_accepted',
            'task_acceptance_required', 'task_accepted',
            'task_rejected_by_expert', 'task_rejected_by_client',
            'milestone_disputed', 'project_ready_for_final',
            'contract_ready', 'contract_awaiting_signature', 'contract_signed',
            'dispute_resolved',
            'modification_proposed', 'modification_approved', 'modification_rejected',
            'escrow_funded'
          )

        UNION ALL

        -- Task approval required (admin created assignment for client — link has /task_id/assignment/project_id)
        SELECT
          n.type AS event_type,
          NULL AS milestone_title,
          COALESCE(p.title, n.title) AS project_title,
          p.id AS project_id,
          'Admin' AS actor_name,
          NULL AS amount,
          n.created_at AS event_time,
          p.task_id AS task_id
        FROM notifications n
        LEFT JOIN projects p ON (
          n.link LIKE '/project/%/assignment/%' AND
          p.id = (REGEXP_MATCH(n.link, '/assignment/([0-9a-f-]{36})'))[1]::uuid
        )
        WHERE n.user_id = $1
          AND n.type = 'task_approval_required'
      ) events
      WHERE event_time IS NOT NULL
      ORDER BY event_time DESC
      LIMIT 25
    `, [userId]);

    res.json({ success: true, activity: result.rows });
  } catch (error) {
    next(error);
  }
};

export const acceptAdminEdit = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;

    const projectRes = await pool.query(
      `SELECT id, title, status, posted_by_expert, posted_by_client, client_id, service_type FROM projects WHERE id = $1`,
      [project_id]
    );
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proiect negăsit' });
    }
    const project = projectRes.rows[0];

    // Only valid if currently pending client approval (admin proposed changes)
    if (project.status !== 'pending_client_approval') {
      return res.status(409).json({
        success: false,
        message: `Acceptarea nu e validă pentru statusul curent '${project.status}'.`
      });
    }

    // Verify ownership
    const ownerId = project.posted_by_expert || project.posted_by_client || project.client_id;
    if (String(ownerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Acces interzis' });
    }

    // User accepted admin's proposal — transition directly to 'open' (or 'in_progress' for PM)
    const newStatus = project.service_type === 'project_management' ? 'in_progress' : 'open';
    const updated = await pool.query(
      `UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, project_id]
    );

    // Notify admin for visibility
    const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminRes.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_approved', 'Task confirmat de utilizator', $2, $3, NOW())`,
        [adminRes.rows[0].id, `Utilizatorul a confirmat modificările la taskul "${project.title}". Proiectul e acum activ.`, `/admin?tab=projects`]
      ).catch(e => console.warn('[bg]', e.message));
    }

    logProjectHistory(project_id, userId, 'user_accept_admin_edit', { new_status: newStatus });

    res.json({ success: true, project: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const rejectAdminEdit = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const projectRes = await pool.query(
      `SELECT id, title, status, posted_by_expert, posted_by_client, client_id FROM projects WHERE id = $1`,
      [project_id]
    );
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proiect negăsit' });
    }
    const project = projectRes.rows[0];

    if (project.status !== 'pending_client_approval') {
      return res.status(409).json({
        success: false,
        message: `Respingerea nu e validă pentru statusul curent '${project.status}'.`
      });
    }

    // Verify ownership
    const ownerId = project.posted_by_expert || project.posted_by_client || project.client_id;
    if (String(ownerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Acces interzis' });
    }

    // Revert to pending_admin_approval — admin must re-edit. Use last_user_feedback (not rejection_reason
    // which is reserved for final reject decisions).
    const updated = await pool.query(
      `UPDATE projects SET status = 'pending_admin_approval', last_user_feedback = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [reason || 'Utilizator a respins modificările admin', project_id]
    );

    // Notify admin
    const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminRes.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_approved', 'Task respins de utilizator', $2, $3, NOW())`,
        [adminRes.rows[0].id, `Utilizatorul a respins modificările la taskul "${project.title}". Este nevoie de revizuire.`, `/admin?tab=projects`]
      ).catch(e => console.warn('[bg]', e.message));
    }

    logProjectHistory(project_id, userId, 'user_reject_admin_edit', { feedback: reason || null });

    res.json({ success: true, project: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Prestator (expert/company) accepts an assignment.
 * Transitions pending_expert_approval → assigned (contracts come next).
 */
export const expertAcceptAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const projRes = await pool.query(
      `SELECT id, status, expert_id, company_id, title, client_id FROM projects WHERE id = $1`,
      [id]
    );
    if (projRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const project = projRes.rows[0];

    if (project.status !== 'pending_expert_approval') {
      return res.status(409).json({
        message: `Acceptarea nu e validă pentru status '${project.status}'.`
      });
    }

    const prestatorId = project.expert_id || project.company_id;
    if (String(prestatorId) !== String(userId)) {
      return res.status(403).json({ message: 'Doar prestatorul asignat poate accepta această sarcină.' });
    }

    const updated = await pool.query(
      `UPDATE projects SET status = 'assigned', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    // If this is a sub-assignment of a PM task, mark parent task in_progress
    // (parent task moves forward as soon as any sub-assignment is accepted)
    const taskIdRes = await pool.query(`SELECT task_id FROM projects WHERE id = $1`, [id]);
    if (taskIdRes.rows[0]?.task_id) {
      await pool.query(
        `UPDATE tasks SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
        [taskIdRes.rows[0].task_id]
      ).catch(e => console.warn('[bg parent task]', e.message));
    }

    // Notify client (in-app + email — client wants to know a prestator was found)
    if (project.client_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_accepted', 'Prestator a acceptat', $2, $3, NOW())`,
        [project.client_id, `Prestatorul a acceptat proiectul "${project.title}". Puteți începe lucrul.`, `/project/${id}`]
      ).catch(e => console.warn('[bg]', e.message));

      const prestatorInfo = await pool.query(`SELECT name FROM users WHERE id = $1`, [prestatorId]);
      sendEmailIfEnabled(pool, project.client_id, 'prestatorAccepted', {
        projectTitle: project.title,
        prestatorName: prestatorInfo.rows[0]?.name || null,
        projectUrl: `${process.env.FRONTEND_URL}/project/${id}`,
      }).catch(e => console.warn('[bg email]', e.message));
    }

    logProjectHistory(id, userId, 'prestator_accept_assignment');

    res.json({ success: true, project: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Prestator (expert/company) refuses an assignment offered by admin.
 * Resets expert_id/company_id, returns project to pending_assignment.
 */
export const expertRejectAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const projRes = await pool.query(
      `SELECT id, status, expert_id, company_id, title, client_id FROM projects WHERE id = $1`,
      [id]
    );
    if (projRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const project = projRes.rows[0];

    if (project.status !== 'pending_expert_approval') {
      return res.status(409).json({
        message: `Respingerea nu e validă pentru status '${project.status}'.`
      });
    }

    const prestatorId = project.expert_id || project.company_id;
    if (String(prestatorId) !== String(userId)) {
      return res.status(403).json({ message: 'Doar prestatorul asignat poate respinge.' });
    }

    // Reset prestator and put back into pending_assignment
    const updated = await pool.query(
      `UPDATE projects
       SET expert_id = NULL, company_id = NULL, status = 'pending_assignment', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Notify admin + client
    const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    for (const uid of [project.client_id, adminRes.rows[0]?.id].filter(Boolean)) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_rejected_by_prestator', 'Prestator a refuzat', $2, $3, NOW())`,
        [uid, `Prestatorul a respins proiectul "${project.title}".${reason ? ' Motiv: ' + reason : ''}`, `/project/${id}`]
      ).catch(e => console.warn('[bg]', e.message));
    }

    logProjectHistory(id, userId, 'prestator_reject_assignment', { reason: reason || null });

    res.json({ success: true, project: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a project. Only the client (beneficiar) or admin can cancel.
 * Blocks cancellation if project is already completed/cancelled/rejected.
 */
/**
 * Generic apply-to-project endpoint.
 * An authenticated prestator (expert/company) requests to be assigned to a marketplace project.
 * The application lands in `task_requests` with status='pending'; admin approves/rejects.
 *
 * Eligibility: project must be open marketplace (status open/pending_assignment, no expert/company,
 * service_type matching/direct). User must be expert/company, kyc_status='verified', NOT the project client.
 */
export const applyToProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { message } = req.body || {};

    if (!['expert', 'company'].includes(userRole)) {
      return res.status(403).json({ error: 'Doar experții și companiile pot aplica la proiecte.' });
    }

    const userKyc = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [userId]);
    if (userKyc.rows[0]?.kyc_status !== 'verified') {
      return res.status(403).json({ error: 'Trebuie să-ți finalizezi verificarea KYC înainte de a aplica.' });
    }

    const projRes = await pool.query(
      `SELECT id, client_id, expert_id, company_id, status, service_type, title
       FROM projects WHERE id = $1`,
      [project_id]
    );
    if (projRes.rows.length === 0) return res.status(404).json({ error: 'Proiect inexistent.' });
    const proj = projRes.rows[0];

    if (String(proj.client_id) === String(userId)) {
      return res.status(400).json({ error: 'Nu poți aplica la propriul proiect.' });
    }
    if (proj.expert_id || proj.company_id) {
      return res.status(409).json({ error: 'Proiectul are deja un prestator asignat.' });
    }
    if (!['open', 'pending_assignment'].includes(proj.status)) {
      return res.status(409).json({ error: `Proiectul nu mai e disponibil pentru aplicații (status: ${proj.status}).` });
    }
    if (!['matching', 'direct'].includes(proj.service_type)) {
      return res.status(400).json({ error: 'Acest proiect nu acceptă aplicații direct (PM/admin-managed).' });
    }

    // Prevent duplicate pending applications
    const dup = await pool.query(
      `SELECT id FROM task_requests
       WHERE user_id = $1 AND project_id = $2 AND status = 'pending'`,
      [userId, project_id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Ai deja o cerere în așteptare pentru acest proiect.' });
    }

    const ins = await pool.query(
      `INSERT INTO task_requests (user_id, project_id, message, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, created_at`,
      [userId, project_id, (message || '').trim() || null]
    );

    // Notify admins about new application
    const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL`);
    for (const a of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'task_acceptance_required', 'Aplicație nouă',
                 $2, $3, NOW())`,
        [a.id, `Un ${userRole === 'expert' ? 'expert' : 'companie'} a aplicat la proiectul "${proj.title}".`, `/admin/dashboard?tab=applications`]
      ).catch(() => {});
    }

    res.status(201).json({
      success: true,
      application: ins.rows[0],
      message: 'Aplicația a fost trimisă adminului. Vei fi notificat când e procesată.',
    });
  } catch (error) {
    console.error('[applyToProject]', error);
    next(error);
  }
};

export const cancelProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projRes = await pool.query(
      `SELECT id, status, client_id, expert_id, company_id, title, task_id FROM projects WHERE id = $1`,
      [id]
    );

    let isPmTaskCancel = false;
    let project;

    if (projRes.rows.length === 0) {
      // Maybe the id is a PM task id (tasks table) rather than a projects id
      const taskRes = await pool.query(
        `SELECT id, status, client_id, title FROM tasks WHERE id = $1`,
        [id]
      );
      if (taskRes.rows.length === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }
      project = { ...taskRes.rows[0], task_id: taskRes.rows[0].id, expert_id: null, company_id: null };
      isPmTaskCancel = true;
    } else {
      project = projRes.rows[0];
    }

    if (!isAdmin && String(project.client_id) !== String(userId)) {
      return res.status(403).json({ message: 'Doar clientul sau adminul poate anula proiectul' });
    }

    if (!canCancel(project.status)) {
      return res.status(409).json({ message: `Proiectul este deja în stare '${project.status}', nu poate fi anulat.` });
    }

    // Once the project contract has been drafted (any state), the beneficiary can no longer cancel —
    // they must go through the contract workflow (sign, dispute, or admin resolution).
    const contractCheck = await pool.query(
      `SELECT 1 FROM contracts
       WHERE project_id = $1 AND contract_type = 'project'
       LIMIT 1`,
      [id]
    );
    if (contractCheck.rows.length > 0) {
      return res.status(409).json({
        message: 'Contractul de colaborare a fost deja inițiat — proiectul nu mai poate fi anulat. Continuă cu workflow-ul sau deschide o dispută.'
      });
    }

    // PM tasks can't be cancelled once assignments exist — must be finalized instead
    if (isPmTaskCancel) {
      const a = await pool.query(
        `SELECT COUNT(*) FROM projects
         WHERE task_id = $1 AND assignment_type = 'task_assignment'
           AND status != 'pending_admin_approval'`,
        [id]
      );
      if (parseInt(a.rows[0].count) > 0) {
        return res.status(409).json({
          message: 'Task-ul are sub-asignări create. Nu mai poate fi anulat. Folosește finalizarea proiectului.'
        });
      }
    }

    const milestoneCheck = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'released') as released_count
       FROM milestones WHERE project_id = $1`,
      [id]
    );
    const hasReleased = parseInt(milestoneCheck.rows[0].released_count) > 0;

    let updated;
    if (isPmTaskCancel) {
      updated = await pool.query(
        `UPDATE tasks SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
    } else {
      updated = await pool.query(
        `UPDATE projects
         SET status = 'cancelled', rejection_reason = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [reason || null, id]
      );
      // Cascade: if this is a PM-related project, also cancel the parent task
      if (project.task_id) {
        await pool.query(
          `UPDATE tasks SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
          [project.task_id]
        );
      }
    }

    const otherPartyId = String(userId) === String(project.client_id)
      ? (project.expert_id || project.company_id)
      : project.client_id;
    if (otherPartyId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'project_cancelled', 'Proiect anulat', $2, $3, NOW())`,
        [otherPartyId, `Proiectul "${project.title}" a fost anulat.${reason ? ' Motiv: ' + reason : ''}`, `/project/${id}`]
      ).catch(e => console.warn('[bg]', e.message));
    }

    logProjectHistory(id, userId, 'cancel', {
      reason: reason || null,
      by_admin: isAdmin,
      had_released: hasReleased,
    });

    res.json({
      success: true,
      project: updated.rows[0],
      has_released_milestones: hasReleased,
      message: hasReleased
        ? 'Proiect anulat. Există milestone-uri deja eliberate — refund-ul va returna doar suma rămasă.'
        : 'Proiect anulat. Poți solicita refund pentru întreaga sumă din escrow.'
    });
  } catch (error) {
    next(error);
  }
};
