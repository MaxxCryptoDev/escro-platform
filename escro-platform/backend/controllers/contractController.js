import pool from '../config/database.js';
import trustProfileHooks from '../services/trustProfileHooks.js';
import referralService from '../services/referralService.js';
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
    try {
      pdfUrl = await generateContractPDF(
        { id: uuidv4(), contract_number: contractNumber, contract_date: new Date() },
        project,
        party1Result.rows[0],
        party2Result.rows[0],
        milestonesResult.rows
      );
    } catch (e) {
      console.log('[createProjectContract] PDF generation failed:', e.message);
    }

    const result = await pool.query(
      `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date, pdf_url)
       VALUES ($1, 'project', $2, $3, $4, 'pending', $5, NOW(), $6)
       RETURNING *`,
      [project_id, party1Id, party2Id, contractText, contractNumber, pdfUrl]
    );

    res.status(201).json({ success: true, contract: result.rows[0], pdf_url: pdfUrl });
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

    const newContracts = [];
    for (const milestone of milestones) {
      if (existingMilestoneIds.includes(milestone.id)) {
        continue;
      }

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
        [project_id, milestone.id, party1Id, party2Id, contractText, generateContractNumber()]
      );

      newContracts.push(result.rows[0]);
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

    // If milestone contract is now accepted by both, start the milestone work
    if (contractJustAccepted && contract.contract_type === 'milestone' && contract.milestone_id) {
      await pool.query(
        `UPDATE milestones SET status = 'in_progress' WHERE id = $1 AND status = 'pending'`,
        [contract.milestone_id]
      );
    }

    // If final contract is accepted by both, mark project as completed
    if (contractJustAccepted && contract.contract_type === 'final') {
      await pool.query(
        `UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [contract.project_id]
      );
    }

    res.json({ success: true, contract: updatedContract });
  } catch (error) {
    next(error);
  }
};

export const getProjectContracts = async (req, res, next) => {
  try {
    const { project_id } = req.params;

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

export const getContract = async (req, res, next) => {
  try {
    const { contract_id } = req.params;

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

    res.json({ success: true, contract: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const generateContract = async (req, res, next) => {
  try {
    const { project_id } = req.params;

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

    const p = projectResult.rows[0];
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
      console.log('[createFinalContract] PDF generation failed:', e.message);
    }

    const result = await pool.query(
      `INSERT INTO contracts (project_id, contract_type, party1_id, party2_id, terms, status, contract_number, contract_date, pdf_url)
       VALUES ($1, 'final', $2, $3, $4, 'pending', $5, NOW(), $6)
       RETURNING *`,
      [project_id, party1Id, party2Id, contractText, contractNumber, pdfUrl]
    );

    res.status(201).json({ success: true, contract: result.rows[0], pdf_url: pdfUrl });
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

    if (project.expert_id) {
      await trustProfileHooks.triggerProjectCompletion(project.expert_id);
      await referralService.completeReferral(project.expert_id);
    }
    if (project.company_id) {
      await trustProfileHooks.triggerProjectCompletion(project.company_id);
      await referralService.completeReferral(project.company_id);
    }

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
          party1_accepted: isParty ? c.party1_accepted : null,
          party2_accepted: isParty ? c.party2_accepted : null
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

    res.json({ success: true, message: 'Materiale încărcate! Așteaptă aprobarea beneficiarului.' });
  } catch (error) {
    next(error);
  }
};

export const approveMilestone = async (req, res, next) => {
  try {
    const { project_id, milestone_id } = req.body;
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

    if (milestone.status !== 'delivered') {
      return res.status(400).json({ error: 'Milestone trebuie să fie livrat pentru a fi aprobat' });
    }

    await pool.query(
      "UPDATE milestones SET status = 'approved', approved_at = NOW(), updated_at = NOW() WHERE id = $1",
      [milestone_id]
    );

    res.json({ success: true, message: 'Milestone aprobat! Banii au fost eliberați către prestator.' });
  } catch (error) {
    next(error);
  }
};

export const generateProcesVerbal = async (req, res, next) => {
  try {
    const { project_id } = req.params;

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
