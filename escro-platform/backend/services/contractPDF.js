import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '..', 'uploads', 'contracts');

if (!fs.existsSync(contractsDir)) {
  fs.mkdirSync(contractsDir, { recursive: true });
}

export const generateContractPDF = async (contract, project, party1, party2, milestones = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = `contract-${contract.id}-${Date.now()}.pdf`;
      const filePath = path.join(contractsDir, fileName);
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: `Contract ${contract.contract_number || ''}`,
          Author: 'ESCRO Platform',
          Subject: 'Contract de Prestări Servicii'
        }
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const contractNumber = contract.contract_number || 'N/A';
      const contractDate = contract.contract_date 
        ? new Date(contract.contract_date).toLocaleDateString('ro-RO')
        : new Date().toLocaleDateString('ro-RO');

      doc.fontSize(14).font('Helvetica-Bold').text('CONTRACT DE PRESTĂRI SERVICII', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(`Nr. ${contractNumber} / Data: ${contractDate}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica-Bold').text('1. PĂRȚILE CONTRACTANTE', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      
      doc.text('Prezentul contract („Contractul") se încheie între:', { continued: false });
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('BENEFICIAR:', { continued: false });
      doc.font('Helvetica').text('');
      doc.text(`Denumire: ${party2.company || party2.name || 'N/A'}`);
      doc.text(`CUI: ${party2.cui || 'N/A'}`);
      doc.text(`Email: ${party2.email || 'N/A'}`);
      doc.text(`Reprezentant: ${party2.name || 'N/A'}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('PRESTATOR:', { continued: false });
      doc.font('Helvetica').text('');
      doc.text(`Denumire: ${party1.company || party1.name || 'N/A'}`);
      doc.text(`CUI: ${party1.cui || 'N/A'}`);
      doc.text(`Email: ${party1.email || 'N/A'}`);
      doc.text(`Reprezentant: ${party1.name || 'N/A'}`);
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(11).text('2. OBIECTUL CONTRACTULUI', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Obiectul prezentului Contract îl reprezintă furnizarea de servicii descrise mai jos:`);
      doc.moveDown(0.5);
      doc.text(`Titlu: ${project.title || 'N/A'}`);
      doc.text(`Descriere: ${project.description || project.task_description || 'N/A'}`);
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(11).text('3. VALOAREA CONTRACTULUI', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Valoarea totală a Contractului este: ${project.budget_ron || project.task_budget || 0} RON`);
      doc.moveDown(0.5);
      doc.text('Plata se va realiza prin intermediul sistemului ESCRO, într-un cont de escrow securizat.');
      doc.text('Fondurile vor fi eliberate către Prestator exclusiv după îndeplinirea milestone-urilor și aprobarea acestora de către Beneficiar.');
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(11).text('4. DURATA CONTRACTULUI', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      const deadline = project.deadline 
        ? new Date(project.deadline).toLocaleDateString('ro-RO')
        : (project.timeline_days ? `${project.timeline_days} zile de la semnare` : 'Conform calendarului proiectului');
      doc.text(`Contractul intră în vigoare la data semnării și rămâne valabil până la: ${deadline}`);
      doc.moveDown(1);

      if (milestones && milestones.length > 0) {
        doc.font('Helvetica-Bold').fontSize(11).text('5. ETAPELE LIVRĂRII (MILESTONES)', { underline: true });
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
        
        milestones.forEach((m, i) => {
          doc.font('Helvetica-Bold').text(`Milestone ${i + 1}: ${m.title}`);
          doc.font('Helvetica').text(`   Sumă: ${m.amount_ron} RON (${m.percentage_of_budget}%)`);
          if (m.deliverable_description) {
            doc.text(`   Descriere: ${m.deliverable_description}`);
          }
          doc.moveDown(0.5);
        });
        doc.moveDown(1);
      }

      doc.font('Helvetica-Bold').fontSize(11).text('6. OBLIGAȚIILE PĂRȚILOR', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      doc.font('Helvetica-Bold').text('Obligațiile Prestatorului:');
      doc.font('Helvetica').text('a) să execute serviciile conform descrierii');
      doc.text('b) să respecte termenele stabilite');
      doc.text('c) să furnizeze rezultate conforme');
      doc.text('d) să comunice progresul prin platforma ESCRO');
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Obligațiile Beneficiarului:');
      doc.font('Helvetica').text('a) să furnizeze informațiile necesare');
      doc.text('b) să depună fondurile în escrow');
      doc.text('c) să analizeze și să aprobe livrările');
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(11).text('7. SEMNĂTURI', { underline: true });
      doc.moveDown(2);

      const pageWidth = doc.page.width - 120;
      const sigLineWidth = pageWidth / 2 - 20;

      doc.font('Helvetica').fontSize(10);
      
      doc.text('BENEFICIAR', 60);
      doc.moveDown(0.5);
      doc.text(`Denumire: ${party2.company || party2.name || 'N/A'}`);
      doc.text(`Reprezentant: ${party2.name || 'N/A'}`);
      doc.moveDown(2);
      doc.text('Semnătura: _______________________', 60);
      doc.text('Data: _______________________', 60);

      doc.text('PRESTATOR', pageWidth + 60);
      doc.moveDown(0.5);
      doc.text(`Denumire: ${party1.company || party1.name || 'N/A'}`);
      doc.text(`Reprezentant: ${party1.name || 'N/A'}`);
      doc.moveDown(2);
      doc.text('Semnătura: _______________________', pageWidth + 60);
      doc.text('Data: _______________________', pageWidth + 60);

      doc.moveDown(3);
      doc.fontSize(8).text('Document generat de platforma ESCRO. Acest contract are valoare juridică conform legislației române în vigoare.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        const pdfUrl = `http://localhost:5000/uploads/contracts/${fileName}`;
        resolve(pdfUrl);
      });

      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

export const generateFinalContractPDF = async (contract, project, party1, party2, milestones, escrow) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = `final-contract-${contract.id}-${Date.now()}.pdf`;
      const filePath = path.join(contractsDir, fileName);
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 }
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const contractNumber = contract.contract_number || 'N/A';
      const contractDate = contract.contract_date 
        ? new Date(contract.contract_date).toLocaleDateString('ro-RO')
        : new Date().toLocaleDateString('ro-RO');

      doc.fontSize(14).font('Helvetica-Bold').text('PROTOCOL DE FINALIZARE A PROIECTULUI', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(`Nr. ${contractNumber} / Data: ${contractDate}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica-Bold').text('1. PĂRȚILE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Beneficiar: ${party2.company || party2.name || 'N/A'}`);
      doc.text(`Reprezentant: ${party2.name || 'N/A'}`);
      doc.text(`Email: ${party2.email || 'N/A'}`);
      doc.moveDown(0.5);
      doc.text(`Prestator: ${party1.company || party1.name || 'N/A'}`);
      doc.text(`Reprezentant: ${party1.name || 'N/A'}`);
      doc.text(`Email: ${party1.email || 'N/A'}`);
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').text('2. OBIECTUL', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Titlu proiect: ${project.title || 'N/A'}`);
      doc.text(`ID Proiect: ${project.id}`);
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').text('3. SITUAȚIA FINANCIARĂ', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Valoarea totală a proiectului: ${project.budget_ron || 0} RON`);
      doc.text(`Suma eliberată către Prestator: ${escrow?.released_to_expert_total_ron || 0} RON`);
      doc.text(`Comision platformă (ESCRO): ${escrow?.claudiu_earned_total_ron || 0} RON`);
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').text('4. CONFIRMAREA FINALIZĂRII', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text('Ambele părți confirmă că:');
      doc.text('- Serviciile au fost executate conform specificațiilor');
      doc.text('- Toate deliverabilele au fost livrate și acceptate');
      doc.text('- Nu există obiecții sau pretenții rămase nerezolvate');
      doc.text('- Proiectul este finalizat cu succes');
      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica-Bold').text('5. SEMNĂTURI', { underline: true });
      doc.moveDown(2);

      const pageWidth = doc.page.width - 120;

      doc.fontSize(10).font('Helvetica');
      doc.text('BENEFICIAR', 60);
      doc.moveDown(2);
      doc.text('Semnătura: _______________________', 60);
      doc.text('Data: _______________________', 60);

      doc.text('PRESTATOR', pageWidth + 60);
      doc.moveDown(2);
      doc.text('Semnătura: _______________________', pageWidth + 60);
      doc.text('Data: _______________________', pageWidth + 60);

      doc.moveDown(3);
      doc.fontSize(8).text('Document generat de platforma ESCRO.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        const pdfUrl = `http://localhost:5000/uploads/contracts/${fileName}`;
        resolve(pdfUrl);
      });

      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};
