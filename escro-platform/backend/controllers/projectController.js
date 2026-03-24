import pool from '../config/database.js';
import { generateContractPDF, generateFinalContractPDF } from '../services/contractPDF.js';
import { v4 as uuidv4 } from 'uuid';

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
    console.log('DEBUG: Received project data:', JSON.stringify(req.body));
    const { title, description, budget_ron, timeline_days, milestones, service_type, direct_partner_email, task_id: incoming_task_id } = req.body;
    const client_id = req.user.id;

    let task_id = incoming_task_id || null;

    if (!title || !description || budget_ron === undefined || budget_ron === null) {
      console.log('DEBUG: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: title, description, budget_ron' });
    }

    // Skip milestone validation for project_management (tasks don't need milestones upfront)
    if (service_type !== 'project_management') {
      if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
        console.log('DEBUG: Invalid milestones:', milestones);
        return res.status(400).json({ error: 'At least one milestone is required' });
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
      } else if (partner.role === 'client') {
        company_id = partner.id;
      }

      // Direct projects start immediately without admin approval
      initialStatus = 'assigned';
      commissionPercent = 10;
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
      
      console.log('DEBUG: PM Task created with ID:', task_id, 'status: pending_admin_approval');
      
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
    console.log('DEBUG: Project created with ID:', project_id);

    for (let index = 0; index < milestones.length; index++) {
      const milestone = milestones[index];
      console.log(`DEBUG: Creating milestone ${index + 1}:`, milestone);
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
      message = 'Project created and partner assigned directly';
    }
    if (safeServiceType === 'project_management') {
      message = 'Project Management task created - you can add assignments from Project Management dashboard';
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

    console.log('[DEBUG] getProjects called - userId:', userId, 'userRole:', userRole);

    // First get regular projects
    let whereClause = '';
    let params = [];

    if (userRole === 'admin') {
      whereClause = '';
    } else if (userRole === 'expert') {
      whereClause = 'WHERE (p.status != \'pending_admin_approval\' OR p.client_id = $1 OR p.expert_id = $1)';
      params = [userId];
    } else if (userRole === 'company') {
      whereClause = 'WHERE (p.status != \'pending_admin_approval\' OR p.client_id = $1 OR p.company_id = $1)';
      params = [userId];
    } else if (userRole === 'client' || userRole === 'company') {
      whereClause = 'WHERE (p.status != \'pending_admin_approval\' OR p.client_id = $1 OR p.posted_by_client = $1 OR p.posted_by_expert = $1)';
      params = [userId];
    } else {
      whereClause = 'WHERE p.status != $1';
      params = ['pending_admin_approval'];
    }

    const result = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.company_id, p.task_id, p.assignment_type, p.title, p.description, p.budget_ron, p.timeline_days, p.status, p.created_at, p.updated_at, p.posted_by_expert, p.posted_by_client, p.expert_posting_status, p.client_posting_status, p.service_type, p.commission_percent, t.title as task_title, t.description as task_description, t.budget_ron as task_budget, t.timeline_days as task_timeline, u.name as client_name, u.email as client_email, u.company as client_company, u.phone as client_phone, u.profile_image_url as client_profile_image_url, u.bio as client_bio, u.industry as client_industry, u.expertise as client_profession, u.experience as client_experience_years, u.cui as client_cui, e.name as expert_name, e.email as expert_email, e.company as expert_company, e.expertise as expert_expertise, e.industry as expert_industry, e.experience as expert_experience_years, e.bio as expert_bio, e.phone as expert_phone, e.profile_image_url as expert_profile_image_url, e.portfolio_description as expert_portfolio_description, e.cui as expert_cui, c.name as company_name, c.company as company_company_name, c.email as company_email, c.phone as company_phone, c.profile_image_url as company_profile_image_url, c.bio as company_bio, c.industry as company_industry, c.expertise as company_expertise, c.experience as company_experience_years, c.cui as company_cui
       FROM projects p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users c ON p.company_id = c.id
       LEFT JOIN tasks t ON p.task_id = t.id
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );

    console.log('[DEBUG] getProjects query result - Found', result.rows.length, 'projects');
    if (result.rows.length > 0) {
      console.log('[DEBUG] First project sample:', JSON.stringify(result.rows[0], null, 2));
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
         WHERE (t.status IN ('open', 'in_progress') OR (t.status = 'pending_admin_approval' AND t.client_id = $1))
         ORDER BY t.created_at DESC
       `;
       const tasksResult = await pool.query(tasksQuery, [userId]);
       pmTasks = tasksResult.rows;
       console.log('[DEBUG] PM Tasks found for expert:', pmTasks.length);
       pmTasks.forEach((t, i) => {
         console.log(`[DEBUG] Task ${i} assigned_experts:`, JSON.stringify(t.assigned_experts));
       });
    } else if (userRole === 'company') {
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
      WHERE (t.status IN ('open', 'in_progress') OR (t.status = 'pending_admin_approval' AND t.client_id = $1))
      ORDER BY t.created_at DESC
    `;
    const tasksResult = await pool.query(tasksQuery, [userId]);
    pmTasks = tasksResult.rows;
    console.log('[DEBUG] PM Tasks found for company:', pmTasks.length);
  } else if (userRole === 'client') {
      // Client: show their own pending tasks + all open/in_progress
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
      WHERE (t.status IN ('open', 'in_progress') OR (t.status = 'pending_admin_approval' AND t.client_id = $1))
      ORDER BY t.created_at DESC
    `;
    const tasksResult = await pool.query(tasksQuery, [userId]);
    pmTasks = tasksResult.rows;
    console.log('[DEBUG] PM Tasks found for client:', pmTasks.length);
  }

  // Combine approved projects and approved PM tasks
    const allProjects = [...result.rows, ...pmTasks];
    
    // Get milestones for each project (only for real projects, not PM tasks)
    const projectsWithMilestones = await Promise.all(
      allProjects.map(async (project) => {
        if (project.is_pm_task) {
          return { ...project, milestones: [] };
        }
        const milestonesResult = await pool.query(
          'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number ASC',
          [project.id]
        );
        return {
          ...project,
          milestones: milestonesResult.rows
        };
      })
    );

    console.log('[DEBUG] getProjects - Total projects + PM tasks:', projectsWithMilestones.length);

    res.json({
      success: true,
      projects: projectsWithMilestones
    });
  } catch (error) {
    console.error('[DEBUG] getProjects error:', error);
    next(error);
  }
};

export const getProjectDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    console.log('[DEBUG getProjectDetail] userId:', userId, 'projectId:', id);

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
      console.log('[DEBUG getProjectDetail] Found task:', task.title);
      
      const isCreator = userId && String(task.client_id) === String(userId);
      
      return res.json({
        success: true,
        project: {
          ...task,
          is_pm_task: true,
          is_creator: isCreator,
          is_owner: isCreator,  // For frontend compatibility
          is_assigned_expert: false,
          is_assigned_company: false,
          can_view_sensitive: isCreator,
          title: task.title,
          description: task.description,
          budget_ron: task.budget_ron,
          timeline_days: task.timeline_days,
          status: task.status
        },
        milestones: []
      });
    }

    // Otherwise, check projects table
    const projectResult = await pool.query(
      `SELECT p.id, p.client_id, p.expert_id, p.company_id, p.task_id, p.assignment_type, p.title, p.description, p.budget_ron, p.timeline_days, p.status, p.created_at, p.updated_at, p.posted_by_expert, p.posted_by_client, p.expert_posting_status, p.client_posting_status, u.name as client_name, u.email as client_email, u.company as client_company, u.phone as client_phone, u.profile_image_url as client_profile_image_url, u.bio as client_bio, u.industry as client_industry, u.expertise as client_profession, u.experience as client_experience_years, u.cui as client_cui, e.name as expert_name, e.email as expert_email, e.company as expert_company, e.expertise as expert_expertise, e.industry as expert_industry, e.experience as expert_experience_years, e.bio as expert_bio, e.phone as expert_phone, e.profile_image_url as expert_profile_image_url, e.portfolio_description as expert_portfolio_description, e.kyc_status as expert_kyc_status, e.cui as expert_cui, c.name as company_name, c.company as company_company_name, c.email as company_email, c.profile_image_url as company_profile_image_url, c.phone as company_phone, c.bio as company_bio, c.industry as company_industry, c.expertise as company_expertise, c.experience as company_experience_years, c.cui as company_cui
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
    
    console.log('[DEBUG getProjectDetail] FULL PROJECT from DB:', JSON.stringify(project, null, 2));

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

    console.log('[DEBUG getProjectDetail] project.client_id:', project.client_id, 'isCreator:', isCreator);
    console.log('[DEBUG getProjectDetail] project.expert_id:', project.expert_id, 'isAssignedExpert:', isAssignedExpert);
    console.log('[DEBUG getProjectDetail] project.company_id:', project.company_id, 'isAssignedCompany:', isAssignedCompany);

    const responseProject = {
      ...project,
      is_creator: isCreator,
      is_assigned_expert: isAssignedExpert,
      is_assigned_company: isAssignedCompany,
      can_view_sensitive: isCreator || isAssignedExpert || isAssignedCompany
    };

    console.log('[DEBUG getProjectDetail] response project:', {
      id: responseProject.id,
      can_view_sensitive: responseProject.can_view_sensitive,
      is_creator: responseProject.is_creator,
      is_assigned_expert: responseProject.is_assigned_expert
    });

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
    updateValues.push('in_progress');
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
