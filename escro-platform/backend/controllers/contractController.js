import pool from '../config/database.js';
import trustProfileHooks from '../services/trustProfileHooks.js';
import referralService from '../services/referralService.js';
import { generateContractPDF, generateMilestoneContractPDF, generateFinalContractPDF } from '../services/contractPDF.js';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailIfEnabled } from '../services/emailService.js';
import { validateSignature } from '../utils/validateSignature.js';

const generateContractNumber = () => {
  // 8 hex chars from uuid v4 gives ~1 in 4 billion collision odds for short codes
  const year = new Date().getFullYear();
  const code = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `ESC-${year}-${code}`;
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

4. SISTEMUL DE PLATĂ ESCROW

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

export const createProjectContract = async (req, res, next) => {
  try {
    const { project_id } = req.body;
    const userId = req.user.id;

    console.log('[createProjectContract] userId:', userId);
    console.log('[createProjectContract] project_id:', project_id);

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    console.log('[createProjectContract] project:', {
      client_id: project.client_id,
      expert_id: project.expert_id,
      company_id: project.company_id
    });

    // Determine parties: party1 = Prestator (expert_id or company_id - assigned), party2 = Beneficiar (client_id - creator)
    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    console.log('[createProjectContract] party1Id:', party1Id, 'party2Id:', party2Id, 'userId:', userId);

    // If only one party exists (no expert and no company), don't allow contract
    if (party1Id === party2Id) {
      return res.status(400).json({ error: 'Proiectul trebuie să aibă cel puțin expert și client/companie pentru a crea un contract' });
    }

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'You must be one of the contract parties' });
    }

    // Check if project contract already exists
    const existingContract = await pool.query(
      "SELECT id FROM contracts WHERE project_id = $1 AND contract_type = 'project'",
      [project_id]
    );
    if (existingContract.rows.length > 0) {
      return res.status(400).json({ error: 'Contractul principal există deja pentru acest proiect' });
    }

    const party1Result = await pool.query('SELECT * FROM users WHERE id = $1', [party1Id]);
    const party2Result = await pool.query('SELECT * FROM users WHERE id = $1', [party2Id]);

    const milestonesResult = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [project_id]);

    if (milestonesResult.rows.length === 0) {
      return res.status(400).json({ error: 'Proiectul trebuie să aibă cel puțin un milestone pentru a crea contractul' });
    }

    const contractText = generateContractText(
      project,
      party1Result.rows[0],
      party2Result.rows[0],
      milestonesResult.rows
    );

    const contractNumber = generateContractNumber();

    let pdfUrl = null;
    let pdfError = null;
    try {
      pdfUrl = await generateContractPDF(
        { id: uuidv4(), contract_number: contractNumber, contract_date: new Date() },
        project,
        party1Result.rows[0],
        party2Result.rows[0],
        milestonesResult.rows
      );
    } catch (e) {
      console.error('[createProjectContract] PDF generation failed:', e.message);
      pdfError = e.message;
    }

    const result = await pool.query(
      `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date, pdf_url)
       VALUES ($1, 'project', $2, $3, $4, 'pending', $5, NOW(), $6)
       RETURNING *`,
      [project_id, party1Id, party2Id, contractText, contractNumber, pdfUrl]
    );

    // Notify both parties that the project contract is ready to sign
    const otherPartyId = userId === party1Id ? party2Id : party1Id;
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'contract_ready', $2, $3, $4, NOW())`,
      [otherPartyId, 'Contract de proiect creat', `Contractul pentru proiectul "${project.title}" este gata. Verifică și semnează.`, `/project/${project_id}`]
    );
    sendEmailIfEnabled(pool, otherPartyId, 'contractPendingSignature', {
      projectTitle: project.title,
      contractType: 'Contract de proiect',
      projectUrl: `${process.env.FRONTEND_URL}/project/${project_id}`,
    }).catch(e => console.warn('[bg]', e.message));

    res.status(201).json({ success: true, contract: result.rows[0], pdf_url: pdfUrl, ...(pdfError ? { pdf_warning: 'PDF-ul nu a putut fi generat. Contractul a fost salvat fără document atașat.' } : {}) });
  } catch (error) {
    next(error);
  }
};

export const createMilestoneContract = async (req, res, next) => {
  try {
    const { project_id, milestone_id } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestoneResult = await pool.query('SELECT * FROM milestones WHERE id = $1', [milestone_id]);
    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const project = projectResult.rows[0];
    const milestone = milestoneResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'You must be one of the contract parties' });
    }

    const party1Result = await pool.query('SELECT * FROM users WHERE id = $1', [party1Id]);
    const party2Result = await pool.query('SELECT * FROM users WHERE id = $1', [party2Id]);

    const contractText = `
CONTRACT MILESTONE

Titlu: ${milestone.title}
Descriere: ${milestone.description || milestone.deliverable_description || 'N/A'}
Sumă: ${milestone.amount_ron} RON
Procent din buget: ${milestone.percentage_of_budget}%

Termen: ${milestone.deadline || 'Conform contractului principal'}

Acest contract este anexă la Contractul de Colaborare Principal și face parte integrantă din acesta.
    `.trim();

    const result = await pool.query(
      `INSERT INTO contracts (project_id, milestone_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date)
       VALUES ($1, $2, 'milestone', $3, $4, $5, 'pending', $6, NOW())
       RETURNING *`,
      [project_id, milestone_id, party1Id, party2Id, contractText, generateContractNumber()]
    );

    res.status(201).json({ success: true, contract: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const createAllMilestoneContracts = async (req, res, next) => {
  try {
    const { project_id } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];
    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'You must be one of the contract parties' });
    }

    const party1Result = await pool.query('SELECT * FROM users WHERE id = $1', [party1Id]);
    const party2Result = await pool.query('SELECT * FROM users WHERE id = $1', [party2Id]);
    const party1 = party1Result.rows[0];
    const party2 = party2Result.rows[0];

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number',
      [project_id]
    );
    const milestones = milestonesResult.rows;

    if (milestones.length === 0) {
      return res.status(400).json({ error: 'No milestones found for this project' });
    }

    const existingContracts = await pool.query(
      "SELECT milestone_id FROM contracts WHERE project_id = $1 AND contract_type = 'milestone'",
      [project_id]
    );
    const existingMilestoneIds = existingContracts.rows.map(c => c.milestone_id);

    // Get project contract number for PDF reference
    const projectContractRes = await pool.query(
      "SELECT contract_number FROM contracts WHERE project_id = $1 AND contract_type = 'project' LIMIT 1",
      [project_id]
    );
    const projectContractNumber = projectContractRes.rows[0]?.contract_number || null;

    const newContracts = [];
    for (const milestone of milestones) {
      if (existingMilestoneIds.includes(milestone.id)) {
        continue;
      }

      const contractText = `ANEXĂ MILESTONE\n\nTitlu: ${milestone.title}\nDescriere: ${milestone.description || milestone.deliverable_description || 'N/A'}\nSumă: ${milestone.amount_ron} RON\nProcent din buget: ${milestone.percentage_of_budget}%\nTermen: ${milestone.deadline || 'Conform contractului principal'}\n\nAceastă anexă face parte integrantă din contractul principal de proiect.`;

      const contractNumber = generateContractNumber();

      const result = await pool.query(
        `INSERT INTO contracts (project_id, milestone_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date)
         VALUES ($1, $2, 'milestone', $3, $4, $5, 'pending', $6, NOW())
         RETURNING *`,
        [project_id, milestone.id, party1Id, party2Id, contractText, contractNumber]
      );

      const insertedContract = result.rows[0];

      let pdfUrl = null;
      try {
        pdfUrl = await generateMilestoneContractPDF(
          { id: insertedContract.id, contract_number: contractNumber, contract_date: new Date() },
          project,
          party1,
          party2,
          milestone,
          projectContractNumber
        );
        await pool.query(
          'UPDATE contracts SET pdf_url = $1 WHERE id = $2',
          [pdfUrl, insertedContract.id]
        );
        insertedContract.pdf_url = pdfUrl;
      } catch (e) {
        console.log('[createAllMilestoneContracts] PDF generation failed for milestone:', milestone.title, e.message);
      }

      newContracts.push(insertedContract);
    }

    // Notify both parties that milestone contracts are ready to sign
    if (newContracts.length > 0) {
      const otherPartyId = userId === party1Id ? party2Id : party1Id;
      const notifMsg = `Contractele pentru milestone-urile proiectului "${project.title}" sunt gata de semnat.`;
      const notifLink = `/project/${project_id}?tab=contracts`;
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'contract_ready', 'Contracte milestone de semnat', $2, $3, NOW()),
                ($4, 'contract_ready', 'Contracte milestone de semnat', $2, $3, NOW())`,
        [otherPartyId, notifMsg, notifLink, userId]
      );
    }

    res.status(201).json({
      success: true,
      contracts: newContracts,
      message: `Created ${newContracts.length} milestone contracts`
    });
  } catch (error) {
    next(error);
  }
};

export const acceptContract = async (req, res, next) => {
  try {
    const { contract_id } = req.params;
    const { signature } = req.body;
    const userId = req.user.id;

    const sigErr = validateSignature(signature);
    if (sigErr) return res.status(sigErr.status).json({ error: sigErr.error });

    const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contract_id]);
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = contractResult.rows[0];

    if (userId !== contract.party1_id && userId !== contract.party2_id) {
      return res.status(403).json({ error: 'You must be one of the contract parties' });
    }

    if (userId === contract.party1_id && contract.party1_accepted) {
      return res.status(400).json({ error: 'You have already accepted this contract' });
    }
    if (userId === contract.party2_id && contract.party2_accepted) {
      return res.status(400).json({ error: 'You have already accepted this contract' });
    }

    // For milestone contracts, check if previous milestone is completed
    if (contract.contract_type === 'milestone' && contract.milestone_id) {
      const allMilestoneContracts = await pool.query(
        "SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'milestone' ORDER BY created_at",
        [contract.project_id]
      );
      
      const currentIndex = allMilestoneContracts.rows.findIndex(c => c.id === contract_id);
      
      if (currentIndex > 0) {
        const prevContract = allMilestoneContracts.rows[currentIndex - 1];
        if (prevContract.status !== 'accepted') {
          return res.status(400).json({ error: 'Trebuie să semnezi și să finalizezi contractul anterior mai întâi' });
        }
      }
    }

    let updateQuery = '';
    let contractJustAccepted = false;
    
    if (userId === contract.party1_id) {
      if (contract.party2_accepted) {
        updateQuery = `UPDATE contracts SET party1_accepted = TRUE, party1_accepted_at = NOW(), party1_signature = $2, party1_signed_at = NOW(),
                       status = 'accepted', updated_at = NOW() 
                       WHERE id = $1 RETURNING *`;
        contractJustAccepted = true;
      } else {
        updateQuery = `UPDATE contracts SET party1_accepted = TRUE, party1_accepted_at = NOW(), party1_signature = $2, party1_signed_at = NOW(),
                       updated_at = NOW() 
                       WHERE id = $1 RETURNING *`;
      }
    } else {
      if (contract.party1_accepted) {
        updateQuery = `UPDATE contracts SET party2_accepted = TRUE, party2_accepted_at = NOW(), party2_signature = $2, party2_signed_at = NOW(),
                       status = 'accepted', updated_at = NOW() 
                       WHERE id = $1 RETURNING *`;
        contractJustAccepted = true;
      } else {
        updateQuery = `UPDATE contracts SET party2_accepted = TRUE, party2_accepted_at = NOW(), party2_signature = $2, party2_signed_at = NOW(),
                       updated_at = NOW() 
                       WHERE id = $1 RETURNING *`;
      }
    }

    const result = await pool.query(updateQuery, [contract_id, signature || null]);
    const updatedContract = result.rows[0];

    // Get project title for notifications
    const projRes = await pool.query('SELECT title FROM projects WHERE id = $1', [contract.project_id]);
    const projectTitle = projRes.rows[0]?.title || 'proiect';
    const otherPartyId = userId === contract.party1_id ? contract.party2_id : contract.party1_id;
    const contractLink = `/project/${contract.project_id}?tab=contracts`;

    if (contractJustAccepted) {
      // PM finalization contract — when both parties sign, mark task completed
      if (contract.contract_type === 'final' && contract.task_id) {
        await pool.query(
          `UPDATE tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [contract.task_id]
        );
      }
      // Both signed — notify both parties
      const bothMsg = contract.contract_type === 'final'
        ? `Contractul final pentru "${projectTitle}" a fost semnat de ambele părți. Proiectul este acum finalizat!`
        : `Contractul pentru "${projectTitle}" a fost semnat de ambele părți și este activ.`;
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'contract_signed', 'Contract semnat', $2, $3, NOW()),
                ($4, 'contract_signed', 'Contract semnat', $2, $3, NOW())`,
        [contract.party1_id, bothMsg, contractLink, contract.party2_id]
      );
    } else {
      // Only one party signed — notify the other to sign
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'contract_awaiting_signature', 'Semnătură necesară', $2, $3, NOW())`,
        [otherPartyId, `O parte a semnat contractul pentru "${projectTitle}". Este rândul tău să semnezi.`, contractLink]
      );
    }

    // If milestone contract is now accepted by both, start the milestone work
    if (contractJustAccepted && contract.contract_type === 'milestone' && contract.milestone_id) {
      await pool.query(
        `UPDATE milestones SET status = 'in_progress' WHERE id = $1 AND status = 'pending'`,
        [contract.milestone_id]
      );
    }

    // If final contract is accepted by both, mark project as completed
    if (contractJustAccepted && contract.contract_type === 'final' && contract.project_id) {
      await pool.query(
        `UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [contract.project_id]
      );
      setImmediate(async () => {
        try { await runProjectContractBackfill(contract.project_id); }
        catch (e) { console.warn('[auto-backfill final]', e.message); }
      });
    }

    // Regenerate PDF with the new signature embedded. Do it AFTER notifications/state updates
    // so a PDF failure doesn't block the signing flow itself.
    try {
      const fullCtxRes = await pool.query(`
        SELECT c.*,
               p.title as project_title, p.description as project_description, p.budget_ron as project_budget_ron,
               p.timeline_days as project_timeline_days, p.deadline as project_deadline,
               u1.name as party1_name, u1.email as party1_email, u1.company as party1_company, u1.cui as party1_cui, u1.phone as party1_phone,
               u2.name as party2_name, u2.email as party2_email, u2.company as party2_company, u2.cui as party2_cui, u2.phone as party2_phone
        FROM contracts c
        JOIN projects p ON c.project_id = p.id
        JOIN users u1 ON c.party1_id = u1.id
        JOIN users u2 ON c.party2_id = u2.id
        WHERE c.id = $1
      `, [contract_id]);
      const ctx = fullCtxRes.rows[0];
      if (ctx) {
        const projectObj = {
          ...ctx,
          title: ctx.project_title,
          description: ctx.project_description,
          budget_ron: ctx.project_budget_ron,
          timeline_days: ctx.project_timeline_days,
          deadline: ctx.project_deadline,
        };
        const p1 = { name: ctx.party1_name, email: ctx.party1_email, company: ctx.party1_company, cui: ctx.party1_cui, phone: ctx.party1_phone };
        const p2 = { name: ctx.party2_name, email: ctx.party2_email, company: ctx.party2_company, cui: ctx.party2_cui, phone: ctx.party2_phone };

        let newPdfUrl = null;
        if (ctx.contract_type === 'final') {
          const allMs = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [ctx.project_id]);
          const escrow = await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1 LIMIT 1', [ctx.project_id]);
          newPdfUrl = await generateFinalContractPDF(ctx, projectObj, p1, p2, allMs.rows, escrow.rows[0] || {});
        } else if (ctx.contract_type === 'milestone' && ctx.milestone_id) {
          const msRes = await pool.query('SELECT * FROM milestones WHERE id = $1', [ctx.milestone_id]);
          newPdfUrl = await generateMilestoneContractPDF(ctx, projectObj, p1, p2, msRes.rows[0] || {});
        } else {
          const allMs = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [ctx.project_id]);
          newPdfUrl = await generateContractPDF(ctx, projectObj, p1, p2, allMs.rows);
        }

        if (newPdfUrl) {
          await pool.query('UPDATE contracts SET pdf_url = $1, updated_at = NOW() WHERE id = $2', [newPdfUrl, contract_id]);
          updatedContract.pdf_url = newPdfUrl;
        }
      }
    } catch (pdfErr) {
      console.warn('[acceptContract] PDF regen with signature failed (non-fatal):', pdfErr.message);
    }

    res.json({ success: true, contract: updatedContract });
  } catch (error) {
    next(error);
  }
};

export const getUserContracts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT c.id) FROM contracts c
       JOIN projects p ON c.project_id = p.id
       WHERE c.party1_id = $1 OR c.party2_id = $1
          OR p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1`,
      [userId]
    );
    const total = parseInt(countRes.rows[0].count) || 0;

    const result = await pool.query(`
      SELECT DISTINCT ON (c.id)
             c.id, c.project_id, c.milestone_id, c.contract_type, c.status,
             c.party1_id, c.party2_id,
             c.party1_accepted, c.party2_accepted,
             c.party1_accepted_at, c.party2_accepted_at,
             c.contract_number, c.created_at, c.pdf_url,
             p.title as project_title,
             u1.name as party1_name, u1.company as party1_company,
             u2.name as party2_name, u2.company as party2_company,
             m.title as milestone_title
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      LEFT JOIN users u1 ON c.party1_id = u1.id
      LEFT JOIN users u2 ON c.party2_id = u2.id
      LEFT JOIN milestones m ON c.milestone_id = m.id
      WHERE c.party1_id = $1 OR c.party2_id = $1
         OR p.client_id = $1 OR p.expert_id = $1 OR p.company_id = $1
      ORDER BY c.id, c.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      success: true,
      contracts: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

export const getProjectContracts = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      const projectCheck = await pool.query(
        'SELECT client_id, expert_id, company_id FROM projects WHERE id = $1',
        [project_id]
      );
      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      const p = projectCheck.rows[0];
      const isParticipant = String(p.client_id) === String(userId) ||
                            String(p.expert_id) === String(userId) ||
                            String(p.company_id) === String(userId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `SELECT c.*,
              u1.name as party1_name, u1.email as party1_email, u1.company as party1_company,
              u2.name as party2_name, u2.email as party2_email, u2.company as party2_company
       FROM contracts c
       LEFT JOIN users u1 ON c.party1_id = u1.id
       LEFT JOIN users u2 ON c.party2_id = u2.id
       WHERE c.project_id = $1
       ORDER BY c.created_at DESC`,
      [project_id]
    );

    res.json({ success: true, contracts: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Re-generate PDF for an existing contract (project/milestone/final).
 * Useful when initial PDF generation failed (returns null pdf_url) or content drifted.
 * Only contract parties or admin can trigger.
 */
export const regenerateContractPdf = async (req, res, next) => {
  try {
    const { contract_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const r = await pool.query(
      `SELECT c.*, p.id AS project_id, p.title AS project_title, p.budget_ron, p.timeline_days, p.deadline,
              u1.name AS expert_name, u1.email AS expert_email, u1.company AS expert_company, u1.cui AS expert_cui,
              u2.name AS client_name, u2.email AS client_email, u2.company AS client_company, u2.cui AS client_cui
       FROM contracts c
       JOIN projects p ON c.project_id = p.id
       LEFT JOIN users u1 ON c.party1_id = u1.id
       LEFT JOIN users u2 ON c.party2_id = u2.id
       WHERE c.id = $1`,
      [contract_id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    const contract = r.rows[0];

    const isParty = [contract.party1_id, contract.party2_id].filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Block regenerate if contract is already fully signed — regenerating would
    // create a PDF that doesn't match the existing signatures (legal integrity risk).
    if (contract.party1_accepted && contract.party2_accepted) {
      return res.status(409).json({
        error: 'Contractul e deja semnat de ambele părți. Pentru modificări, creează o nouă versiune (anexă).'
      });
    }

    const project = { ...contract, title: contract.project_title };
    const expert = { name: contract.expert_name, email: contract.expert_email, company: contract.expert_company, cui: contract.expert_cui };
    const client = { name: contract.client_name, email: contract.client_email, company: contract.client_company, cui: contract.client_cui };

    let pdfUrl = null;
    try {
      if (contract.contract_type === 'final') {
        const allMs = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [contract.project_id]);
        const escrow = await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1 LIMIT 1', [contract.project_id]);
        pdfUrl = await generateFinalContractPDF(contract, project, expert, client, allMs.rows, escrow.rows[0] || {});
      } else if (contract.contract_type === 'milestone' && contract.milestone_id) {
        const msRes = await pool.query('SELECT * FROM milestones WHERE id = $1', [contract.milestone_id]);
        pdfUrl = await generateMilestoneContractPDF(contract, project, expert, client, msRes.rows[0] || {});
      } else {
        // project contract
        const allMs = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [contract.project_id]);
        pdfUrl = await generateContractPDF(contract, project, expert, client, allMs.rows);
      }
    } catch (pdfErr) {
      return res.status(500).json({ error: 'Generare PDF eșuată: ' + pdfErr.message });
    }

    if (pdfUrl) {
      await pool.query('UPDATE contracts SET pdf_url = $1, updated_at = NOW() WHERE id = $2', [pdfUrl, contract_id]);
    }

    res.json({ success: true, pdf_url: pdfUrl });
  } catch (error) { next(error); }
};

export const getContract = async (req, res, next) => {
  try {
    const { contract_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const result = await pool.query(
      `SELECT c.*,
              u1.name as party1_name, u1.email as party1_email, u1.company as party1_company,
              u2.name as party2_name, u2.email as party2_email, u2.company as party2_company
       FROM contracts c
       LEFT JOIN users u1 ON c.party1_id = u1.id
       LEFT JOIN users u2 ON c.party2_id = u2.id
       WHERE c.id = $1`,
      [contract_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = result.rows[0];
    const isParty = [contract.party1_id, contract.party2_id]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, contract });
  } catch (error) {
    next(error);
  }
};

export const generateContract = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projectResult = await pool.query(
      `SELECT p.*, t.title as task_title, t.description as task_description, t.budget_ron as task_budget, t.timeline_days as task_timeline,
              c.name as client_name, c.email as client_email, c.company as client_company, c.cui as client_cui,
              e.name as expert_name, e.email as expert_email, e.company as expert_company, e.cui as expert_cui,
              comp.name as company_name, comp.email as company_email, comp.company as company_company_name, comp.cui as company_cui
       FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       LEFT JOIN users c ON p.client_id = c.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users comp ON p.company_id = comp.id
       WHERE p.id = $1`,
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only project parties or admin can generate contract PDF
    const p = projectResult.rows[0];
    const isParty = [p.client_id, p.expert_id, p.company_id]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const contractNumber = generateContractNumber();
    const contractDate = new Date().toISOString().split('T')[0];
    const deadline = p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : `${p.task_timeline} zile de la semnare`;

    const beneficiaryName = p.client_name || p.client_company || 'NECOMPLETAT';
    const beneficiaryId = p.client_cui || 'NECOMPLETAT';
    const beneficiaryEmail = p.client_email || 'NECOMPLETAT';
    
    const providerName = p.company_name || p.expert_name || p.company_company_name || 'NECOMPLETAT';
    const providerId = p.company_cui || p.expert_cui || 'NECOMPLETAT';
    const providerEmail = p.company_email || p.expert_email || 'NECOMPLETAT';

    const contract = `CONTRACT DE PRESTĂRI SERVICII

Nr. ${contractNumber} / Data ${contractDate}

Încheiat între:

1. BENEFICIAR
Nume / Denumire: ${beneficiaryName}
CUI / CNP: ${beneficiaryId}
Email: ${beneficiaryEmail}

și

2. PRESTATOR
Nume / Denumire: ${providerName}
CUI / CNP: ${providerId}
Email: ${providerEmail}

denumite împreună „Părțile".

Art. 1 – Obiectul Contractului

Obiectul prezentului contract îl reprezintă prestarea următoarelor servicii:

Titlu Task: ${p.task_title || 'NECOMPLETAT'}

Descriere: ${p.task_description || 'NECOMPLETAT'}

Prestatorul se obligă să execute serviciile conform descrierii și termenelor stabilite în platformă.

Art. 2 – Durata

Prezentul contract este valabil de la data semnării până la data finalizării serviciilor, respectiv: ${deadline}

Art. 3 – Valoarea Contractului

Valoarea totală a contractului este: ${p.task_budget || p.budget_ron || 'NECOMPLETAT'} RON

Plata se realizează prin sistemul escrow al platformei ESCRO, conform următoarelor reguli:
- Suma este blocată la acceptarea contractului
- Eliberarea fondurilor se face la validarea finalizării serviciului
- În caz de dispută, se aplică termenii și condițiile platformei

Art. 4 – Obligațiile Prestatorului
- Să execute serviciile conform descrierii
- Să respecte termenul stabilit
- Să comunice progresul prin platformă
- Să livreze rezultatul în formatul agreat

Art. 5 – Obligațiile Beneficiarului
- Să furnizeze informațiile necesare executării serviciului
- Să valideze sau să respingă livrarea într-un termen rezonabil
- Să efectueze plata prin sistemul platformei

Art. 6 – Confidențialitate

Părțile se obligă să păstreze confidențialitatea informațiilor schimbate în cadrul colaborării.

Art. 7 – Încetarea Contractului

Contractul încetează:
- prin finalizarea obligațiilor
- prin acordul părților
- prin reziliere în caz de neexecutare gravă

Art. 8 – Litigii

Orice litigiu se soluționează pe cale amiabilă, iar în caz contrar, de instanțele competente din România.

Semnat electronic prin intermediul platformei ESCRO:

Beneficiar
Semnătură electronică: __________

Prestator  
Semnătură electronică: __________`;

    res.json({ success: true, contract });
  } catch (error) {
    next(error);
  }
};

export const createFinalContract = async (req, res, next) => {
  try {
    const { project_id } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'You must be one of the contract parties' });
    }

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1',
      [project_id]
    );

    const allApproved = milestonesResult.rows.every(m => m.status === 'approved' || m.status === 'released');
    if (!allApproved) {
      return res.status(400).json({ error: 'All milestones must be approved before final contract' });
    }

    const existingFinal = await pool.query(
      "SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'final'",
      [project_id]
    );
    if (existingFinal.rows.length > 0) {
      return res.status(400).json({ error: 'Final contract already exists' });
    }

    const party1Result = await pool.query('SELECT * FROM users WHERE id = $1', [party1Id]);
    const party2Result = await pool.query('SELECT * FROM users WHERE id = $1', [party2Id]);
    const party1 = party1Result.rows[0];
    const party2 = party2Result.rows[0];

    const escrowResult = await pool.query(
      'SELECT * FROM escrow_accounts WHERE project_id = $1',
      [project_id]
    );
    const escrow = escrowResult.rows[0];

    const contractText = `
PROTOCOL DE FINALIZARE A PROIECTULUI

Nr. ${generateContractNumber()} din data ${new Date().toISOString().split('T')[0]}

1. PĂRȚILE

1.1. Beneficiar: ${party2?.company || party2?.name || 'N/A'}
      Reprezentant: ${party2?.name || 'N/A'}
      Email: ${party2?.email || 'N/A'}

1.2. Prestator: ${party1?.company || party1?.name || 'N/A'}
      Reprezentant: ${party1?.name || 'N/A'}
      Email: ${party1?.email || 'N/A'}

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

    const contractNumber = generateContractNumber();

    let pdfUrl = null;
    let pdfError = null;
    try {
      pdfUrl = await generateFinalContractPDF(
        { id: uuidv4(), contract_number: contractNumber, contract_date: new Date() },
        project,
        party1,
        party2,
        milestonesResult.rows,
        escrow
      );
    } catch (e) {
      console.error('[createFinalContract] PDF generation failed:', e.message);
      pdfError = e.message;
    }

    const result = await pool.query(
      `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date, pdf_url)
       VALUES ($1, 'final', $2, $3, $4, 'pending', $5, NOW(), $6)
       RETURNING *`,
      [project_id, party1Id, party2Id, contractText, contractNumber, pdfUrl]
    );

    // Notify other party that final contract is ready to sign
    const otherPartyId = userId === party1Id ? party2Id : party1Id;
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'contract_ready', 'Contract final de semnat', $2, $3, NOW())`,
      [otherPartyId, `Toate milestone-urile din "${project.title}" au fost finalizate. Semnează contractul final pentru a închide proiectul.`, `/project/${project_id}`]
    );

    res.status(201).json({ success: true, contract: result.rows[0], pdf_url: pdfUrl, ...(pdfError ? { pdf_warning: 'PDF-ul nu a putut fi generat. Contractul a fost salvat fără document atașat.' } : {}) });
  } catch (error) {
    next(error);
  }
};

export const completeProject = async (req, res, next) => {
  try {
    const { project_id } = req.body;
    const userId = req.user.id;

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const party1Id = project.expert_id || project.company_id;
    const party2Id = project.client_id;

    if (userId !== party1Id && userId !== party2Id) {
      return res.status(403).json({ error: 'You must be one of the contract parties' });
    }

    const finalContractResult = await pool.query(
      "SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'final' AND status = 'accepted'",
      [project_id]
    );

    if (finalContractResult.rows.length === 0) {
      return res.status(400).json({ error: 'Final contract must be accepted by both parties first' });
    }

    const result = await pool.query(
      `UPDATE projects SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
      [project_id]
    );

    setImmediate(async () => {
      try { await runProjectContractBackfill(project_id); }
      catch (e) { console.warn('[auto-backfill complete]', e.message); }
    });

    if (project.expert_id) {
      await trustProfileHooks.triggerProjectCompletion(project.expert_id);
      await referralService.completeReferral(project.expert_id);
    }
    if (project.company_id) {
      await trustProfileHooks.triggerProjectCompletion(project.company_id);
      await referralService.completeReferral(project.company_id);
    }

    // Monetary referral rewards are credited at allApproved (milestoneController), not here

    res.json({ success: true, project: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getContractWorkflowStatus = async (req, res, next) => {
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

    const projectContractResult = await pool.query(
      "SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'project' ORDER BY created_at DESC LIMIT 1",
      [project_id]
    );

    const milestoneContractsResult = await pool.query(
      "SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'milestone' ORDER BY created_at",
      [project_id]
    );

    const deliveryContractsResult = await pool.query(
      `SELECT c.*, m.title as milestone_title, m.order_number as milestone_order
       FROM contracts c
       LEFT JOIN milestones m ON c.milestone_id = m.id
       WHERE c.project_id = $1 AND c.contract_type = 'milestone' AND c.milestone_id IS NOT NULL
         AND (c.pdf_url IS NOT NULL OR c.party1_accepted = true OR c.party2_accepted = true
              OR c.contract_number LIKE 'PRED-%')
       ORDER BY m.order_number, c.created_at`,
      [project_id]
    );

    const finalContractResult = await pool.query(
      "SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'final' ORDER BY created_at DESC LIMIT 1",
      [project_id]
    );

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number',
      [project_id]
    );

    const projectContract = projectContractResult.rows[0];
    const milestoneContracts = milestoneContractsResult.rows;
    const deliveryContracts = deliveryContractsResult.rows;
    const finalContract = finalContractResult.rows[0];
    const milestones = milestonesResult.rows;

    let currentStep = 'no_contract';
    if (!projectContract) {
      currentStep = 'no_contract';
    } else if (projectContract.status !== 'accepted') {
      currentStep = 'project_contract_pending';
    } else if (milestoneContracts.length === 0) {
      currentStep = 'ready_for_milestones';
    } else {
      const allMilestonesApproved = milestones.every(m => m.status === 'approved' || m.status === 'released');
      const pendingMilestoneContracts = milestoneContracts.filter(c => c.status !== 'accepted');
      
      if (!allMilestonesApproved) {
        currentStep = 'milestones_in_progress';
      } else if (!finalContract) {
        currentStep = 'ready_for_final';
      } else if (finalContract.status !== 'accepted') {
        currentStep = 'final_contract_pending';
      } else {
        currentStep = 'project_completed';
      }
    }

    res.json({
      success: true,
      workflow: {
        currentStep,
        projectContract: projectContract ? {
          id: projectContract.id,
          status: projectContract.status,
          party1_id: projectContract.party1_id,
          party2_id: projectContract.party2_id,
          party1_accepted: isParty ? projectContract.party1_accepted : null,
          party2_accepted: isParty ? projectContract.party2_accepted : null,
          contract_number: projectContract.contract_number,
          pdf_url: projectContract.pdf_url,
          contract_date: projectContract.contract_date
        } : null,
        milestoneContracts: milestoneContracts.map(c => ({
          id: c.id,
          milestone_id: c.milestone_id,
          status: c.status,
          party1_id: c.party1_id,
          party2_id: c.party2_id,
          party1_accepted: isParty ? c.party1_accepted : null,
          party2_accepted: isParty ? c.party2_accepted : null,
          pdf_url: isParty ? c.pdf_url : null,
          contract_number: c.contract_number
        })),
        deliveryContracts: deliveryContracts.map(c => ({
          id: c.id,
          milestone_id: c.milestone_id,
          milestone_title: c.milestone_title,
          status: c.status,
          party1_id: c.party1_id,
          party2_id: c.party2_id,
          party1_accepted: isParty ? c.party1_accepted : null,
          party2_accepted: isParty ? c.party2_accepted : null,
          pdf_url: isParty ? c.pdf_url : null,
          contract_number: c.contract_number
        })),
        milestones: milestones.map(m => ({
          id: m.id,
          title: m.title,
          status: m.status,
          amount_ron: m.amount_ron,
          deliverable_file_url: isParty ? m.deliverable_file_url : null,
          party1_approved: isParty ? m.party1_approved : null,
          party2_approved: isParty ? m.party2_approved : null
        })),
        finalContract: finalContract ? {
          id: finalContract.id,
          status: finalContract.status,
          party1_id: finalContract.party1_id,
          party2_id: finalContract.party2_id,
          party1_accepted: isParty ? finalContract.party1_accepted : null,
          party2_accepted: isParty ? finalContract.party2_accepted : null,
          pdf_url: finalContract.pdf_url,
          contract_number: finalContract.contract_number,
          contract_date: finalContract.contract_date
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const signMilestoneStart = async (req, res, next) => {
  try {
    const { project_id, milestone_id, signature } = req.body;
    const userId = req.user.id;

    const sigErr = validateSignature(signature);
    if (sigErr) return res.status(sigErr.status).json({ error: sigErr.error });

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

    const milestoneResult = await pool.query('SELECT * FROM milestones WHERE id = $1 AND project_id = $2', [milestone_id, project_id]);
    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    const milestone = milestoneResult.rows[0];

    const existingSignatures = await pool.query(
      "SELECT * FROM milestone_signatures WHERE milestone_id = $1 AND project_id = $2",
      [milestone_id, project_id]
    );

    const hasSigned = existingSignatures.rows.some(s => s.signed_by === userId);
    if (hasSigned) {
      return res.status(400).json({ error: 'Ai semnat deja pentru acest milestone' });
    }

    const isUserParty1 = userId === party1Id;
    const otherHasSigned = existingSignatures.rows.length > 0;

    await pool.query(
      "INSERT INTO milestone_signatures (project_id, milestone_id, signed_by, signed_at, party1_approved, party2_approved, signature) VALUES ($1, $2, $3, NOW(), $4, $5, $6)",
      [project_id, milestone_id, userId, isUserParty1, !isUserParty1, signature || null]
    );

    if (isUserParty1) {
      await pool.query(
        "UPDATE milestones SET party1_approved = TRUE, party1_approved_at = NOW(), status = CASE WHEN party2_approved = TRUE THEN 'in_progress' ELSE status END, updated_at = NOW() WHERE id = $1",
        [milestone_id]
      );
    } else {
      await pool.query(
        "UPDATE milestones SET party2_approved = TRUE, party2_approved_at = NOW(), status = CASE WHEN party1_approved = TRUE THEN 'in_progress' ELSE status END, updated_at = NOW() WHERE id = $1",
        [milestone_id]
      );
    }

    const updatedMilestone = await pool.query('SELECT * FROM milestones WHERE id = $1', [milestone_id]);
    const bothSigned = updatedMilestone.rows[0].party1_approved && updatedMilestone.rows[0].party2_approved;

    // Sync the contracts table so pending_contracts_for_me reflects actual state
    const msContract = await pool.query(
      "SELECT id FROM contracts WHERE project_id = $1 AND milestone_id = $2 AND contract_type = 'milestone' LIMIT 1",
      [project_id, milestone_id]
    );
    if (msContract.rows.length > 0) {
      const cid = msContract.rows[0].id;
      if (isUserParty1) {
        await pool.query(
          `UPDATE contracts SET party1_accepted = TRUE, party1_accepted_at = NOW(),
           status = CASE WHEN party2_accepted = TRUE THEN 'accepted' ELSE status END
           WHERE id = $1`,
          [cid]
        );
      } else {
        await pool.query(
          `UPDATE contracts SET party2_accepted = TRUE, party2_accepted_at = NOW(),
           status = CASE WHEN party1_accepted = TRUE THEN 'accepted' ELSE status END
           WHERE id = $1`,
          [cid]
        );
      }
    }

    // Notify the other party if only one has signed
    if (!bothSigned) {
      const otherPartyId = isUserParty1 ? party2Id : party1Id;
      const projTitleRes = await pool.query('SELECT title FROM projects WHERE id = $1', [project_id]);
      const projectTitle = projTitleRes.rows[0]?.title || 'proiect';
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, created_at)
         VALUES ($1, 'contract_awaiting_signature', 'Semnătură necesară', $2, $3, NOW())`,
        [otherPartyId, `O parte a semnat pentru milestone-ul din "${projectTitle}". Este rândul tău să semnezi.`, `/project/${project_id}?tab=contracts`]
      );
    }

    res.json({ success: true, message: bothSigned ? 'Milestone început!' : 'Ai semnat, așteaptă semnătura celeilalte părți' });
  } catch (error) {
    next(error);
  }
};

export const deliverMilestone = async (req, res, next) => {
  try {
    const { project_id, milestone_id, deliverable_url } = req.body;
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

    const milestoneResult = await pool.query('SELECT * FROM milestones WHERE id = $1 AND project_id = $2', [milestone_id, project_id]);
    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    const milestone = milestoneResult.rows[0];

    if (milestone.status !== 'in_progress') {
      return res.status(400).json({ error: 'Milestone trebuie să fie în lucru pentru a încărca materiale' });
    }

    await pool.query(
      "UPDATE milestones SET status = 'delivered', deliverable_file_url = $1, delivered_at = NOW(), updated_at = NOW() WHERE id = $2",
      [deliverable_url, milestone_id]
    );

    // Notify client that milestone was delivered
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, created_at)
       VALUES ($1, 'milestone_delivered', 'Milestone livrat', $2, $3, NOW())`,
      [party2Id, `Prestatorul a livrat milestone-ul "${milestone.title}". Verifică livrabilele și aprobă.`, `/project/${project_id}`]
    );

    res.json({ success: true, message: 'Materiale încărcate! Așteaptă aprobarea beneficiarului.' });
  } catch (error) {
    next(error);
  }
};

// approveMilestone removed — superseded by milestoneController.approveMilestone which has FOR UPDATE,
// fund check, contract gate, and is the only registered route at PUT /api/milestones/:id/approve.

export const generateProcesVerbal = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projectResult = await pool.query(
      `SELECT p.*, t.title as task_title,
              c.name as client_name, c.email as client_email, c.company as client_company, c.cui as client_cui,
              e.name as expert_name, e.email as expert_email, e.company as expert_company, e.cui as expert_cui,
              comp.name as company_name, comp.email as company_email, comp.company as company_company_name, comp.cui as company_cui,
              con.contract_number, con.contract_date
       FROM projects p
       LEFT JOIN tasks t ON p.task_id = t.id
       LEFT JOIN users c ON p.client_id = c.id
       LEFT JOIN users e ON p.expert_id = e.id
       LEFT JOIN users comp ON p.company_id = comp.id
       LEFT JOIN contracts con ON con.project_id = p.id AND con.contract_type = 'project'
       WHERE p.id = $1`,
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proiect negăsit' });
    }

    const p = projectResult.rows[0];

    // Only project parties or admin can generate proces-verbal PDF
    const isParty = [p.client_id, p.expert_id, p.company_id]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const completionDate = new Date().toISOString().split('T')[0];
    const contractNumber = p.contract_number || generateContractNumber();
    const contractDate = p.contract_date || new Date().toISOString().split('T')[0];

    const partyA = p.company_name || p.expert_name || p.company_company_name || 'NECOMPLETAT';
    const partyAId = p.company_cui || p.expert_cui || 'NECOMPLETAT';
    const partyB = p.client_name || p.client_company || 'NECOMPLETAT';
    const partyBId = p.client_cui || 'NECOMPLETAT';

    const procesVerbal = `PROCES-VERBAL DE RECEPȚIE FINALĂ

la Contractul de Prestări Servicii Nr. ${contractNumber} din ${contractDate}

Data: ${completionDate}

1. Părțile

Între:

Prestator:
${partyA}
CUI/ID: ${partyAId}
Reprezentant: ${partyA}

și

Beneficiar:
${partyB}
CUI/ID: ${partyBId}
Reprezentant: ${partyB}

2. Obiectul

Prin prezentul document, părțile confirmă finalizarea integrală a proiectului:

Titlu proiect: ${p.task_title || p.title || 'NECOMPLETAT'}

Valoare totală: ${p.task_budget || p.budget_ron || 'NECOMPLETAT'} RON

3. Recepția

Părțile declară că serviciile au fost prestate în conformitate cu cerințele contractuale și sunt acceptate fără obiecțiuni.

4. Dispoziții finale

Prezentul proces-verbal semnat de ambele părți confirmă încheierea contractului și exonerează prestatorul de orice obligații suplimentare.

Semnături:

_________________________          _________________________
Prestator                              Beneficiar

Data: ____________`;

    res.json({ procesVerbal });
  } catch (error) {
    next(error);
  }
};

export async function runProjectContractBackfill(projectId) {
  const projRes = await pool.query(
    `SELECT p.*,
            u1.name as expert_name, u1.email as expert_email, u1.company as expert_company, u1.cui as expert_cui,
            u2.name as client_name, u2.email as client_email, u2.company as client_company, u2.cui as client_cui
     FROM projects p
     LEFT JOIN users u1 ON (p.expert_id = u1.id OR p.company_id = u1.id)
     LEFT JOIN users u2 ON p.client_id = u2.id
     WHERE p.id = $1`,
    [projectId]
  );
  if (!projRes.rows.length) return { skipped: true, reason: 'project_not_found' };
  const proj = projRes.rows[0];

  const msRes = await pool.query(
    `SELECT * FROM milestones WHERE project_id = $1 AND status IN ('approved','released') ORDER BY order_number`,
    [projectId]
  );
  const milestones = msRes.rows;

  const party1Id = proj.expert_id || proj.company_id;
  const party2Id = proj.client_id;
  const expert = { name: proj.expert_name, email: proj.expert_email, company: proj.expert_company, cui: proj.expert_cui };
  const client = { name: proj.client_name, email: proj.client_email, company: proj.client_company, cui: proj.client_cui };

  const createdMilestoneContracts = [];
  for (const ms of milestones) {
    const existing = await pool.query(
      `SELECT id FROM contracts WHERE project_id = $1 AND milestone_id = $2 AND contract_type = 'milestone'`,
      [projectId, ms.id]
    );
    if (existing.rows.length > 0) continue;

    const contractNumber = `PRED-${Date.now()}-${ms.order_number || ms.id.slice(0, 4)}`;
    const predTerms = `CONTRACT PREDARE-PRIMIRE (Backfill)\n\nMilestone: ${ms.title}\nSumă: ${ms.amount_ron} RON`;
    const ins = await pool.query(
      `INSERT INTO contracts (project_id, milestone_id, contract_type, party1_id, party2_id,
         terms, party1_accepted, party1_accepted_at, party2_accepted, party2_accepted_at,
         status, contract_number, contract_date)
       VALUES ($1, $2, 'milestone', $3, $4, $5, true, NOW(), true, NOW(), 'accepted', $6, NOW()) RETURNING *`,
      [projectId, ms.id, party1Id, party2Id, predTerms, contractNumber]
    );
    const contractRec = ins.rows[0];

    const pdfUrl = await generateMilestoneContractPDF(contractRec, proj, expert, client, ms)
      .catch(e => { console.warn('[backfill PDF milestone]', e.message); return null; });
    if (pdfUrl) await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, contractRec.id]);

    createdMilestoneContracts.push(contractRec.id);
  }

  let createdFinalContract = null;
  const existingFinal = await pool.query(
    `SELECT id FROM contracts WHERE project_id = $1 AND contract_type = 'final'`,
    [projectId]
  );
  if (existingFinal.rows.length === 0 && milestones.length > 0) {
    const escrowRes = await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1 LIMIT 1', [projectId]);
    const fcNumber = `FINAL-BACKFILL-${Date.now()}`;
    const fcTerms = `CONTRACT FINALIZARE PROIECT (Backfill)\n\nProiect: ${proj.title || ''}`;
    const fcIns = await pool.query(
      `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id,
         terms, party1_accepted, party1_accepted_at, party2_accepted, party2_accepted_at,
         status, contract_number, contract_date)
       VALUES ($1, 'final', $2, $3, $4, true, NOW(), true, NOW(), 'accepted', $5, NOW()) RETURNING *`,
      [projectId, party1Id, party2Id, fcTerms, fcNumber]
    );
    const fcRec = fcIns.rows[0];
    const allMs = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [projectId]);
    const pdfUrl = await generateFinalContractPDF(fcRec, proj, expert, client, allMs.rows, escrowRes.rows[0] || {})
      .catch(e => { console.warn('[backfill PDF final]', e.message); return null; });
    if (pdfUrl) await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, fcRec.id]);
    createdFinalContract = fcRec.id;
  }

  return {
    skipped: false,
    createdMilestoneContracts,
    createdFinalContract,
  };
}

export const backfillProjectContracts = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projAuthRes = await pool.query(
      `SELECT client_id, expert_id, company_id FROM projects WHERE id = $1`,
      [project_id]
    );
    if (!projAuthRes.rows.length) return res.status(404).json({ error: 'Project not found' });
    const projAuth = projAuthRes.rows[0];

    const isParty = [projAuth.client_id, projAuth.expert_id, projAuth.company_id]
      .filter(Boolean).map(String).includes(String(userId));
    if (!isParty && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    const result = await runProjectContractBackfill(project_id);
    if (result.skipped) return res.status(404).json({ error: 'Project not found' });

    res.json({
      success: true,
      created_milestone_contracts: result.createdMilestoneContracts.length,
      created_final_contract: !!result.createdFinalContract,
      message: `Backfill complet: ${result.createdMilestoneContracts.length} contracte predare-primire + ${result.createdFinalContract ? 1 : 0} contract finalizare.`
    });
  } catch (error) {
    next(error);
  }
};

// DEAD CODE PLACEHOLDER — original duplicate logic below; will remove next
// Pre-create predare-primire (and final, if last milestone) contracts so the expert can
// review the PDF and sign before the file is uploaded. Idempotent: returns existing contracts
// if already prepared.
export const prepareDelivery = async (req, res, next) => {
  try {
    const { milestone_id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;

    const msRes = await pool.query(
      `SELECT m.*, p.client_id, p.expert_id, p.company_id, p.title as project_title, p.budget_ron, p.id as proj_id,
              u1.name as expert_name, u1.email as expert_email, u1.company as expert_company, u1.cui as expert_cui,
              u2.name as client_name, u2.email as client_email, u2.company as client_company, u2.cui as client_cui
       FROM milestones m JOIN projects p ON m.project_id = p.id
       LEFT JOIN users u1 ON (p.expert_id = u1.id OR p.company_id = u1.id)
       LEFT JOIN users u2 ON p.client_id = u2.id
       WHERE m.id = $1 AND m.project_id = $2`,
      [milestone_id, project_id]
    );
    if (!msRes.rows.length) return res.status(404).json({ error: 'Milestone not found' });
    const data = msRes.rows[0];
    const prestatorId = data.expert_id || data.company_id;
    const isPrestator = String(userId) === String(prestatorId);
    const isClient = String(userId) === String(data.client_id);
    if (!isPrestator && !isClient) {
      return res.status(403).json({ error: 'Trebuie să fii parte în proiect.' });
    }

    const projSigned = await pool.query(
      `SELECT 1 FROM contracts WHERE project_id = $1 AND contract_type = 'project'
         AND party1_accepted = TRUE AND party2_accepted = TRUE LIMIT 1`,
      [project_id]
    );
    if (!projSigned.rows.length) {
      return res.status(412).json({ error: 'Contractul de colaborare nu a fost semnat de ambele părți.' });
    }

    const escFunded = await pool.query(
      `SELECT 1 FROM escrow_accounts WHERE project_id = $1 AND held_balance_ron > 0 LIMIT 1`,
      [project_id]
    );
    if (!escFunded.rows.length) {
      return res.status(412).json({ error: 'Clientul nu a depus încă fondurile în escrow.' });
    }

    const expert = { name: data.expert_name, email: data.expert_email, company: data.expert_company, cui: data.expert_cui };
    const client = { name: data.client_name, email: data.client_email, company: data.client_company, cui: data.client_cui };
    const projForPdf = { id: data.proj_id, title: data.project_title, budget_ron: data.budget_ron, client_id: data.client_id, expert_id: data.expert_id, company_id: data.company_id };
    const msForPdf = { id: data.id, title: data.title, deliverable_description: data.deliverable_description, amount_ron: data.amount_ron, order_number: data.order_number };

    let predContract;
    const existingPred = await pool.query(
      `SELECT * FROM contracts WHERE project_id = $1 AND milestone_id = $2 AND contract_type = 'milestone' LIMIT 1`,
      [project_id, milestone_id]
    );
    if (existingPred.rows.length > 0) {
      predContract = existingPred.rows[0];
    } else {
      const predNumber = `PRED-${Date.now()}-${milestone_id.slice(0, 4)}`;
      const predTerms = `CONTRACT PREDARE-PRIMIRE\n\nMilestone: ${data.title}\nDescriere livrabil: ${data.deliverable_description || 'N/A'}\nSumă: ${data.amount_ron} RON\n\nPrin semnare, prestatorul confirmă livrarea acestui milestone iar beneficiarul confirmă primirea livrabilului și autorizează eliberarea fondurilor din escrow.`;
      const ins = await pool.query(
        `INSERT INTO contracts (project_id, milestone_id, contract_type, party1_id, party2_id,
                                terms, status, contract_number, contract_date)
         VALUES ($1, $2, 'milestone', $3, $4, $5, 'pending', $6, NOW()) RETURNING *`,
        [project_id, milestone_id, prestatorId, data.client_id, predTerms, predNumber]
      );
      predContract = ins.rows[0];
      const pdfUrl = await generateMilestoneContractPDF(predContract, projForPdf, expert, client, msForPdf)
        .catch(e => { console.warn('[prepareDelivery PRED PDF]', e.message); return null; });
      if (pdfUrl) {
        await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, predContract.id]);
        predContract.pdf_url = pdfUrl;
      }
    }

    const otherMs = await pool.query(
      `SELECT status FROM milestones WHERE project_id = $1 AND id != $2`,
      [project_id, milestone_id]
    );
    const isLastMilestone = otherMs.rows.length === 0
      || otherMs.rows.every(m => ['approved', 'released'].includes(m.status));

    let finalContract = null;
    if (isLastMilestone) {
      const existingFinal = await pool.query(
        `SELECT * FROM contracts WHERE project_id = $1 AND contract_type = 'final' LIMIT 1`,
        [project_id]
      );
      if (existingFinal.rows.length > 0) {
        finalContract = existingFinal.rows[0];
      } else {
        const finalNumber = `FINAL-${Date.now()}`;
        const finalTerms = `CONTRACT FINALIZARE PROIECT\n\nProiect: ${data.project_title}\nBuget total: ${data.budget_ron} RON\n\nPrin semnare, ambele părți confirmă finalizarea tuturor milestone-urilor și autorizează eliberarea plății finale. Proiectul va fi marcat finalizat.`;
        const ins = await pool.query(
          `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id,
                                  terms, status, contract_number, contract_date)
           VALUES ($1, 'final', $2, $3, $4, 'pending', $5, NOW()) RETURNING *`,
          [project_id, prestatorId, data.client_id, finalTerms, finalNumber]
        );
        finalContract = ins.rows[0];
        const allMs = await pool.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_number', [project_id]);
        const escrowData = await pool.query('SELECT * FROM escrow_accounts WHERE project_id = $1 LIMIT 1', [project_id]);
        const pdfUrl = await generateFinalContractPDF(finalContract, projForPdf, expert, client, allMs.rows, escrowData.rows[0] || {})
          .catch(e => { console.warn('[prepareDelivery FINAL PDF]', e.message); return null; });
        if (pdfUrl) {
          await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, finalContract.id]);
          finalContract.pdf_url = pdfUrl;
        }
      }
    }

    res.json({
      success: true,
      predContract,
      finalContract,
      isLastMilestone
    });
  } catch (error) {
    console.error('[prepareDelivery]', error);
    next(error);
  }
};

// PM finalization contract — between platform (admin) and beneficiary (client).
// Created when the client clicks "Semnează finalizarea proiectului" on a PM task.
// Platform side auto-signs; client signs via acceptContract.
export const preparePmFinalize = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const taskRes = await pool.query(
      `SELECT t.*, u.name as client_name, u.email as client_email, u.company as client_company, u.cui as client_cui
       FROM tasks t LEFT JOIN users u ON t.client_id = u.id
       WHERE t.id = $1`,
      [taskId]
    );
    if (!taskRes.rows.length) return res.status(404).json({ error: 'Task not found' });
    const task = taskRes.rows[0];

    if (String(task.client_id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Doar beneficiarul poate finaliza proiectul.' });
    }

    const assignmentsRes = await pool.query(
      `SELECT status FROM projects
       WHERE task_id = $1 AND assignment_type = 'task_assignment'
         AND status != 'pending_admin_approval'`,
      [taskId]
    );
    if (assignmentsRes.rows.length === 0) {
      return res.status(412).json({ error: 'Task-ul nu are sub-asignări create.' });
    }
    const pending = assignmentsRes.rows.filter(r => r.status !== 'completed');
    if (pending.length > 0) {
      return res.status(412).json({
        error: `Toate sub-asignările trebuie să fie finalizate (${pending.length} încă nefinalizate).`
      });
    }

    const adminRes = await pool.query(
      `SELECT id, name, email, company, cui FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`
    );
    if (!adminRes.rows.length) return res.status(500).json({ error: 'Niciun admin platformă găsit.' });
    const admin = adminRes.rows[0];

    let contract;
    const existingRes = await pool.query(
      `SELECT * FROM contracts WHERE task_id = $1 AND contract_type = 'final' LIMIT 1`,
      [taskId]
    );
    if (existingRes.rows.length > 0) {
      contract = existingRes.rows[0];
    } else {
      const contractNumber = `PMFINAL-${Date.now()}`;
      const terms = `CONTRACT FINALIZARE PROIECT (Platformă - Beneficiar)\n\n`
        + `Proiect: ${task.title}\nBuget total: ${task.budget_ron} RON\n\n`
        + `Prin semnare, beneficiarul confirmă finalizarea cu succes a proiectului de management de proiect și autorizează închiderea relației contractuale între platformă și beneficiar.`;
      const ins = await pool.query(
        `INSERT INTO contracts (task_id, contract_type, party1_id, party2_id,
                                terms, party1_accepted, party1_accepted_at,
                                status, contract_number, contract_date)
         VALUES ($1, 'final', $2, $3, $4, true, NOW(), 'pending', $5, NOW()) RETURNING *`,
        [taskId, admin.id, task.client_id, terms, contractNumber]
      );
      contract = ins.rows[0];

      const allMsRes = await pool.query(
        `SELECT m.* FROM milestones m
         JOIN projects p ON m.project_id = p.id
         WHERE p.task_id = $1 ORDER BY m.created_at`,
        [taskId]
      );
      const projForPdf = { id: taskId, title: task.title, budget_ron: task.budget_ron, client_id: task.client_id };
      const p1 = { name: admin.name || 'ESCRO Platform', email: admin.email, company: admin.company || 'ESCRO Platform', cui: admin.cui };
      const p2 = { name: task.client_name, email: task.client_email, company: task.client_company, cui: task.client_cui };
      const pdfUrl = await generateFinalContractPDF(contract, projForPdf, p1, p2, allMsRes.rows, {})
        .catch(e => { console.warn('[PM final PDF]', e.message); return null; });
      if (pdfUrl) {
        await pool.query('UPDATE contracts SET pdf_url = $1 WHERE id = $2', [pdfUrl, contract.id]);
        contract.pdf_url = pdfUrl;
      }
    }

    res.json({ success: true, contract });
  } catch (err) {
    console.error('[preparePmFinalize]', err);
    next(err);
  }
};
