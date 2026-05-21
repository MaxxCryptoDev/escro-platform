import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '..', 'uploads', 'contracts');
const invoicesDir = path.join(__dirname, '..', 'uploads', 'invoices');

if (!fs.existsSync(contractsDir)) {
  fs.mkdirSync(contractsDir, { recursive: true });
}
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

// Unicode fonts with full Romanian diacritic support (ă â î ș ț) —
// PDFKit's built-in Helvetica only covers WinAnsi, so diacritics appeared mojibake.
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REGULAR_PATH = path.join(fontsDir, 'DejaVuSans.ttf');
const FONT_BOLD_PATH = path.join(fontsDir, 'DejaVuSans-Bold.ttf');
const HAS_UNICODE_FONTS = fs.existsSync(FONT_REGULAR_PATH) && fs.existsSync(FONT_BOLD_PATH);
const FONT_REGULAR = HAS_UNICODE_FONTS ? 'RoSans' : FONT_REGULAR;
const FONT_BOLD = HAS_UNICODE_FONTS ? 'RoSans-Bold' : FONT_BOLD;

function registerUnicodeFonts(doc) {
  if (HAS_UNICODE_FONTS) {
    doc.registerFont('RoSans', FONT_REGULAR_PATH);
    doc.registerFont('RoSans-Bold', FONT_BOLD_PATH);
  }
}

// Brand colors for ESCRO contract PDFs
const C = {
  ink: '#0f172a',         // primary text
  inkSoft: '#334155',     // body text
  muted: '#64748b',       // captions
  accent: '#2563eb',      // ESCRO blue
  accentBg: '#eff6ff',    // soft accent fill
  divider: '#e2e8f0',     // border / line
  cardBg: '#f8fafc',      // box fill
  success: '#059669',
};

// Draw an ESCRO-branded header bar at the top of the page
function drawDocumentHeader(doc, { eyebrow, title, number, date }) {
  const pageWidth = doc.page.width;
  const margin = 50;
  // Accent stripe
  doc.rect(0, 0, pageWidth, 6).fill(C.accent);

  doc.fillColor(C.ink);
  doc.font(FONT_BOLD).fontSize(9).fillColor(C.accent).text('ESCRO', margin, 22);
  doc.font(FONT_REGULAR).fontSize(8).fillColor(C.muted).text('Plăți garantate în escrow', margin, 35);

  // Right side: contract meta
  if (number || date) {
    const right = pageWidth - margin;
    if (number) {
      doc.font(FONT_REGULAR).fontSize(8).fillColor(C.muted).text(`Nr. ${number}`, margin, 22, { width: right - margin, align: 'right' });
    }
    if (date) {
      doc.font(FONT_REGULAR).fontSize(8).fillColor(C.muted).text(`Data: ${date}`, margin, 35, { width: right - margin, align: 'right' });
    }
  }

  doc.moveTo(margin, 55).lineTo(pageWidth - margin, 55).strokeColor(C.divider).lineWidth(0.5).stroke();

  // Eyebrow + title
  doc.moveDown(0);
  doc.y = 75;
  if (eyebrow) {
    doc.font(FONT_REGULAR).fontSize(8).fillColor(C.muted).text(eyebrow.toUpperCase(), { characterSpacing: 1.5 });
  }
  doc.moveDown(0.2);
  doc.font(FONT_BOLD).fontSize(20).fillColor(C.ink).text(title);
  doc.moveDown(1);
  doc.fillColor(C.ink);
}

// Section heading with accent bar
function drawSectionHeader(doc, label) {
  const margin = doc.page.margins.left;
  const y = doc.y + 6;
  doc.rect(margin, y, 3, 14).fill(C.accent);
  doc.font(FONT_BOLD).fontSize(11).fillColor(C.ink).text(label, margin + 10, y);
  doc.moveDown(0.5);
  doc.fillColor(C.inkSoft);
}

// Two-column party box
function drawPartyBoxes(doc, party1, party1Label, party2, party2Label) {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width - margin * 2;
  const colW = (pageWidth - 12) / 2;
  const startY = doc.y;
  const padding = 12;

  const writeParty = (x, label, party) => {
    doc.font(FONT_REGULAR).fontSize(8).fillColor(C.muted).text(label.toUpperCase(), x + padding, startY + padding, { width: colW - padding * 2, characterSpacing: 1.2 });
    doc.font(FONT_BOLD).fontSize(11).fillColor(C.ink).text(party.company || party.name || 'N/A', x + padding, doc.y + 2, { width: colW - padding * 2 });
    doc.font(FONT_REGULAR).fontSize(9).fillColor(C.inkSoft);
    doc.moveDown(0.3);
    if (party.cui) doc.text(`CUI: ${party.cui}`, x + padding, doc.y, { width: colW - padding * 2 });
    if (party.email) doc.text(`Email: ${party.email}`, x + padding, doc.y, { width: colW - padding * 2 });
    if (party.name && party.company) doc.text(`Reprezentant: ${party.name}`, x + padding, doc.y, { width: colW - padding * 2 });
    if (party.phone) doc.text(`Tel: ${party.phone}`, x + padding, doc.y, { width: colW - padding * 2 });
  };

  // First column
  const beforeY = doc.y;
  writeParty(margin, party1Label, party1);
  const col1Bottom = doc.y;

  // Second column at same Y start
  doc.y = startY;
  writeParty(margin + colW + 12, party2Label, party2);
  const col2Bottom = doc.y;

  const boxBottom = Math.max(col1Bottom, col2Bottom) + padding;
  const boxHeight = boxBottom - startY;
  // Draw the borders behind (after computing heights)
  doc.save();
  doc.roundedRect(margin, startY, colW, boxHeight, 6).strokeColor(C.divider).fillColor(C.cardBg).lineWidth(0.8).fillAndStroke();
  doc.roundedRect(margin + colW + 12, startY, colW, boxHeight, 6).strokeColor(C.divider).fillColor(C.cardBg).lineWidth(0.8).fillAndStroke();
  doc.restore();

  // Redraw text on top
  doc.y = startY;
  writeParty(margin, party1Label, party1);
  doc.y = startY;
  writeParty(margin + colW + 12, party2Label, party2);

  doc.y = boxBottom + 10;
  doc.fillColor(C.ink);
}

// Body paragraph helper
function drawParagraph(doc, text) {
  doc.font(FONT_REGULAR).fontSize(10).fillColor(C.inkSoft).text(text, { align: 'justify' });
  doc.moveDown(0.5);
  doc.fillColor(C.ink);
}

// Key-value row (highlighted)
function drawHighlight(doc, label, value) {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width - margin * 2;
  const y = doc.y + 2;
  doc.roundedRect(margin, y, pageWidth, 28, 6).fillColor(C.accentBg).fill();
  doc.font(FONT_REGULAR).fontSize(9).fillColor(C.muted).text(label.toUpperCase(), margin + 12, y + 6, { characterSpacing: 1 });
  doc.font(FONT_BOLD).fontSize(13).fillColor(C.accent).text(value, margin + 12, y + 16, { width: pageWidth - 24, align: 'right' });
  doc.y = y + 36;
  doc.fillColor(C.ink);
}

// Milestone row
function drawMilestoneRow(doc, idx, m) {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width - margin * 2;
  const y = doc.y;
  const rowH = m.deliverable_description ? 56 : 38;
  doc.roundedRect(margin, y, pageWidth, rowH, 5).strokeColor(C.divider).lineWidth(0.6).stroke();
  // Index circle
  doc.circle(margin + 16, y + 18, 10).fillColor(C.accent).fill();
  doc.font(FONT_BOLD).fontSize(9).fillColor('#fff').text(String(idx + 1), margin + 11, y + 14, { width: 12, align: 'center' });
  // Title + sum
  doc.font(FONT_BOLD).fontSize(10).fillColor(C.ink).text(m.title || `Milestone ${idx + 1}`, margin + 34, y + 8, { width: pageWidth - 200 });
  doc.font(FONT_REGULAR).fontSize(9).fillColor(C.muted).text(`${m.percentage_of_budget || 0}% din valoarea totală`, margin + 34, y + 22, { width: pageWidth - 200 });
  // Amount right-aligned
  doc.font(FONT_BOLD).fontSize(11).fillColor(C.accent).text(`${parseFloat(m.amount_ron || 0).toLocaleString('ro-RO')} RON`, pageWidth - 90, y + 14, { width: 100, align: 'right' });
  if (m.deliverable_description) {
    doc.font(FONT_REGULAR).fontSize(9).fillColor(C.inkSoft).text(m.deliverable_description, margin + 34, y + 38, { width: pageWidth - 50 });
  }
  doc.y = y + rowH + 6;
  doc.fillColor(C.ink);
}

// Signature block — embeds signature PNGs if available, otherwise leaves blank lines
function drawSignatures(doc, party1, party2, sigInfo = {}) {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width - margin * 2;
  const colW = (pageWidth - 20) / 2;
  const startY = doc.y + 10;
  const boxH = 140;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const writeSig = (x, label, party, signatureDataUrl, signedAt) => {
    doc.roundedRect(x, startY, colW, boxH, 6).strokeColor(C.divider).lineWidth(0.8).stroke();

    // Header
    doc.font(FONT_REGULAR).fontSize(8).fillColor(C.muted).text(label.toUpperCase(), x + 12, startY + 10, { characterSpacing: 1.2 });
    doc.font(FONT_BOLD).fontSize(10).fillColor(C.ink).text(party.company || party.name || 'N/A', x + 12, startY + 22, { width: colW - 24 });
    if (party.name && party.company) {
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor(C.inkSoft).text(`Reprezentant: ${party.name}`, x + 12, doc.y + 1, { width: colW - 24 });
    }

    // Signature area (height ~50px) — between header and bottom line
    const sigAreaTop = startY + 56;
    const sigAreaH = 52;
    if (signatureDataUrl && typeof signatureDataUrl === 'string' && signatureDataUrl.startsWith('data:image/')) {
      try {
        const sigW = colW - 30;
        // pdfkit accepts data URI directly via image()
        doc.image(signatureDataUrl, x + 15, sigAreaTop, {
          fit: [sigW, sigAreaH],
          align: 'center',
          valign: 'center',
        });
      } catch (e) {
        // Fallback: leave blank
      }
    }

    // Bottom line + caption
    const lineY = startY + boxH - 30;
    doc.moveTo(x + 12, lineY).lineTo(x + colW - 12, lineY).strokeColor(C.divider).lineWidth(0.5).stroke();
    doc.font(FONT_REGULAR).fontSize(8).fillColor(C.muted).text('Semnătura', x + 12, lineY + 6);
    doc.text(`Data: ${fmtDate(signedAt)}`, x + colW / 2, lineY + 6);

    // Signed badge in top-right
    if (signatureDataUrl) {
      const badgeW = 56;
      doc.roundedRect(x + colW - badgeW - 10, startY + 8, badgeW, 16, 8).fillColor(C.success).fill();
      doc.font(FONT_BOLD).fontSize(7.5).fillColor('#fff').text('✓ SEMNAT', x + colW - badgeW - 10, startY + 12, { width: badgeW, align: 'center', characterSpacing: 1 });
      doc.fillColor(C.ink);
    }
  };

  writeSig(margin, 'Beneficiar', party2, sigInfo.party2Signature, sigInfo.party2SignedAt);
  writeSig(margin + colW + 20, 'Prestator', party1, sigInfo.party1Signature, sigInfo.party1SignedAt);
  doc.y = startY + boxH + 10;
  doc.fillColor(C.ink);
}

// Footer fine print
function drawFineFooter(doc) {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width - margin * 2;
  const bottomY = doc.page.height - 40;
  doc.moveTo(margin, bottomY - 8).lineTo(margin + pageWidth, bottomY - 8).strokeColor(C.divider).lineWidth(0.3).stroke();
  doc.font(FONT_REGULAR).fontSize(7).fillColor(C.muted).text(
    'Document generat de platforma ESCRO. Are valoare juridică conform art. 1166 Cod Civil și legislației române privind contractele electronice.',
    margin, bottomY, { width: pageWidth, align: 'center' }
  );
}

export const generateContractPDF = async (contract, project, party1, party2, milestones = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = `contract-${contract.id}-${Date.now()}.pdf`;
      const filePath = path.join(contractsDir, fileName);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 110, bottom: 60, left: 50, right: 50 },
        info: {
          Title: `Contract ${contract.contract_number || ''}`,
          Author: 'ESCRO Platform',
          Subject: 'Contract de Prestări Servicii'
        }
      });

      registerUnicodeFonts(doc);

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const contractNumber = contract.contract_number || 'N/A';
      const contractDate = contract.contract_date
        ? new Date(contract.contract_date).toLocaleDateString('ro-RO')
        : new Date().toLocaleDateString('ro-RO');
      const budget = parseFloat(project.budget_ron || project.task_budget || 0);
      const deadline = project.deadline
        ? new Date(project.deadline).toLocaleDateString('ro-RO')
        : (project.timeline_days ? `${project.timeline_days} zile de la semnare` : 'Conform calendarului proiectului');

      // Header (drawn at top of every page via pageAdded event)
      drawDocumentHeader(doc, {
        eyebrow: 'Contract de prestări servicii',
        title: project.title || 'Contract',
        number: contractNumber,
        date: contractDate,
      });

      // Section 1: Parties
      drawSectionHeader(doc, '1. Părțile contractante');
      drawParagraph(doc, 'Prezentul contract („Contractul") se încheie între părțile menționate mai jos:');
      drawPartyBoxes(doc, party1, 'Prestator', party2, 'Beneficiar');

      // Section 2: Object
      drawSectionHeader(doc, '2. Obiectul contractului');
      drawParagraph(doc, `Obiectul prezentului Contract îl reprezintă furnizarea de servicii descrise în detaliu mai jos. Toate livrările se vor face conform brief-ului convenit între părți prin platforma ESCRO.`);
      doc.font(FONT_BOLD).fontSize(10).fillColor(C.ink).text(project.title || 'N/A');
      doc.moveDown(0.2);
      doc.font(FONT_REGULAR).fontSize(9.5).fillColor(C.inkSoft).text(project.description || project.task_description || 'Fără descriere detaliată.', { align: 'justify' });
      doc.moveDown(0.8);
      doc.fillColor(C.ink);

      // Section 3: Value (highlighted)
      drawSectionHeader(doc, '3. Valoarea contractului');
      drawHighlight(doc, 'Valoare totală', `${budget.toLocaleString('ro-RO')} RON`);
      drawParagraph(doc, 'Plata se va realiza exclusiv prin sistemul ESCRO, într-un cont de escrow securizat. Fondurile sunt blocate la depunere și se eliberează către Prestator pe baza milestone-urilor aprobate de Beneficiar. ESCRO percepe o comisie pentru intermedierea plății, conform termenilor platformei.');

      // Section 4: Duration
      drawSectionHeader(doc, '4. Durata contractului');
      drawParagraph(doc, `Contractul intră în vigoare la data semnării de către ambele părți și rămâne valabil până la livrarea integrală a serviciilor. Termen estimat: ${deadline}.`);

      // Section 5: Milestones
      if (milestones && milestones.length > 0) {
        if (doc.y > doc.page.height - 220) doc.addPage();
        drawSectionHeader(doc, '5. Etapele livrării (milestones)');
        drawParagraph(doc, 'Plata se eliberează etapizat, după aprobarea fiecărui milestone de către Beneficiar prin platformă:');
        milestones.forEach((m, i) => {
          if (doc.y > doc.page.height - 100) doc.addPage();
          drawMilestoneRow(doc, i, m);
        });
        doc.moveDown(0.5);
      }

      // Section 6: Obligations
      if (doc.y > doc.page.height - 240) doc.addPage();
      drawSectionHeader(doc, '6. Obligațiile părților');
      doc.font(FONT_BOLD).fontSize(10).fillColor(C.ink).text('Prestator:');
      doc.font(FONT_REGULAR).fontSize(9.5).fillColor(C.inkSoft);
      doc.text('•  să execute serviciile conform descrierii și standardelor profesionale aplicabile;');
      doc.text('•  să respecte termenele stabilite pe milestone-uri;');
      doc.text('•  să livreze rezultate conforme cu specificațiile;');
      doc.text('•  să comunice progresul exclusiv prin platforma ESCRO.');
      doc.moveDown(0.5);
      doc.font(FONT_BOLD).fontSize(10).fillColor(C.ink).text('Beneficiar:');
      doc.font(FONT_REGULAR).fontSize(9.5).fillColor(C.inkSoft);
      doc.text('•  să furnizeze informațiile, materialele și acordurile necesare execuției;');
      doc.text('•  să depună integral fondurile în escrow înainte de demararea lucrului;');
      doc.text('•  să analizeze și să aprobe livrările conform termenelor convenite;');
      doc.text('•  să comunice eventuale revizuiri prin canalele platformei.');
      doc.moveDown(1);
      doc.fillColor(C.ink);

      // Section 7: Dispute resolution
      if (doc.y > doc.page.height - 200) doc.addPage();
      drawSectionHeader(doc, '7. Soluționarea disputelor');
      drawParagraph(doc, 'Eventualele neînțelegeri se vor rezolva prima dată direct între părți. În cazul în care nu se ajunge la o soluție amiabilă, oricare parte poate iniția o procedură de arbitraj prin platforma ESCRO. Decizia de arbitraj este obligatorie și se aplică automat asupra fondurilor din escrow.');

      // Section 8: Signatures (embeds signature PNGs from contract record)
      if (doc.y > doc.page.height - 220) doc.addPage();
      drawSectionHeader(doc, '8. Semnături');
      drawParagraph(doc, 'Prin semnarea electronică a prezentului Contract, părțile confirmă că au citit, înțeles și sunt de acord cu toate clauzele de mai sus.');
      drawSignatures(doc, party1, party2, {
        party1Signature: contract.party1_signature,
        party1SignedAt: contract.party1_signed_at || contract.party1_accepted_at,
        party2Signature: contract.party2_signature,
        party2SignedAt: contract.party2_signed_at || contract.party2_accepted_at,
      });

      // Footer on last page
      drawFineFooter(doc);

      doc.end();

      writeStream.on('finish', () => {
        const pdfUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/contracts/${fileName}`;
        resolve(pdfUrl);
      });

      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

export const generateMilestoneContractPDF = async (contract, project, party1, party2, milestone, projectContractNumber = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = `milestone-contract-${contract.id}-${Date.now()}.pdf`;
      const filePath = path.join(contractsDir, fileName);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: `Anexă Milestone ${contract.contract_number || ''}`,
          Author: 'ESCRO Platform',
          Subject: 'Anexă Contract Milestone'
        }
      });

      registerUnicodeFonts(doc);

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const contractNumber = contract.contract_number || 'N/A';
      const contractDate = contract.contract_date
        ? new Date(contract.contract_date).toLocaleDateString('ro-RO')
        : new Date().toLocaleDateString('ro-RO');

      doc.fontSize(14).font(FONT_BOLD).text('ANEXĂ LA CONTRACT — MILESTONE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font(FONT_REGULAR).text(`Nr. ${contractNumber} / Data: ${contractDate}`, { align: 'center' });
      if (projectContractNumber) {
        doc.fontSize(10).text(`la Contractul de Proiect Nr. ${projectContractNumber}`, { align: 'center' });
      }
      doc.moveDown(2);

      doc.fontSize(11).font(FONT_BOLD).text('1. PĂRȚILE CONTRACTANTE', { underline: true });
      doc.moveDown(0.5);
      doc.font(FONT_REGULAR).fontSize(10);

      doc.font(FONT_BOLD).text('BENEFICIAR:');
      doc.font(FONT_REGULAR);
      doc.text(`Denumire: ${party2.company || party2.name || 'N/A'}`);
      doc.text(`CUI: ${party2.cui || 'N/A'}`);
      doc.text(`Email: ${party2.email || 'N/A'}`);
      doc.text(`Reprezentant: ${party2.name || 'N/A'}`);
      doc.moveDown(0.5);

      doc.font(FONT_BOLD).text('PRESTATOR:');
      doc.font(FONT_REGULAR);
      doc.text(`Denumire: ${party1.company || party1.name || 'N/A'}`);
      doc.text(`CUI: ${party1.cui || 'N/A'}`);
      doc.text(`Email: ${party1.email || 'N/A'}`);
      doc.text(`Reprezentant: ${party1.name || 'N/A'}`);
      doc.moveDown(1);

      doc.font(FONT_BOLD).fontSize(11).text('2. OBIECTUL MILESTONE-ULUI', { underline: true });
      doc.moveDown(0.5);
      doc.font(FONT_REGULAR).fontSize(10);
      doc.text(`Proiect: ${project.title || 'N/A'}`);
      doc.text(`Milestone: ${milestone.title || 'N/A'}`);
      if (milestone.deliverable_description || milestone.description) {
        doc.text(`Descriere livrabil: ${milestone.deliverable_description || milestone.description || 'N/A'}`);
      }
      doc.moveDown(1);

      doc.font(FONT_BOLD).fontSize(11).text('3. VALOAREA ȘI TERMENUL', { underline: true });
      doc.moveDown(0.5);
      doc.font(FONT_REGULAR).fontSize(10);
      doc.text(`Valoarea milestone-ului: ${milestone.amount_ron || 0} RON (${milestone.percentage_of_budget || '—'}% din bugetul total)`);
      const msDeadline = milestone.deadline
        ? new Date(milestone.deadline).toLocaleDateString('ro-RO')
        : 'Conform contractului principal';
      doc.text(`Termen de finalizare: ${msDeadline}`);
      doc.moveDown(0.5);
      doc.text('Fondurile aferente acestui milestone sunt blocate în escrow și vor fi eliberate exclusiv după aprobarea livrabilului de către Beneficiar.');
      doc.moveDown(1);

      doc.font(FONT_BOLD).fontSize(11).text('4. OBLIGAȚII', { underline: true });
      doc.moveDown(0.5);
      doc.font(FONT_REGULAR).fontSize(10);
      doc.font(FONT_BOLD).text('Prestatorul se obligă:');
      doc.font(FONT_REGULAR);
      doc.text('a) să finalizeze și să livreze rezultatele milestone-ului conform descrierii');
      doc.text('b) să respecte termenul stabilit');
      doc.text('c) să încarce livrabilele în platformă pentru verificare');
      doc.moveDown(0.5);
      doc.font(FONT_BOLD).text('Beneficiarul se obligă:');
      doc.font(FONT_REGULAR);
      doc.text('a) să analizeze livrabilele în termen de 7 zile de la livrare');
      doc.text('b) să aprobe sau să solicite revizuiri justificate');
      doc.text('c) să nu blocheze aprobarea fără motiv temeinic');
      doc.moveDown(1);

      if (doc.y > doc.page.height - 220) doc.addPage();
      drawSectionHeader(doc, '5. Semnături');
      drawParagraph(doc, 'Prin semnarea acestei anexe, părțile confirmă obiectul și condițiile milestone-ului.');
      drawSignatures(doc, party1, party2, {
        party1Signature: contract.party1_signature,
        party1SignedAt: contract.party1_signed_at || contract.party1_accepted_at,
        party2Signature: contract.party2_signature,
        party2SignedAt: contract.party2_signed_at || contract.party2_accepted_at,
      });

      drawFineFooter(doc);

      doc.end();

      writeStream.on('finish', () => {
        const pdfUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/contracts/${fileName}`;
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

      registerUnicodeFonts(doc);

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const contractNumber = contract.contract_number || 'N/A';
      const contractDate = contract.contract_date 
        ? new Date(contract.contract_date).toLocaleDateString('ro-RO')
        : new Date().toLocaleDateString('ro-RO');

      doc.fontSize(14).font(FONT_BOLD).text('PROTOCOL DE FINALIZARE A PROIECTULUI', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font(FONT_REGULAR).text(`Nr. ${contractNumber} / Data: ${contractDate}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).font(FONT_BOLD).text('1. PĂRȚILE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font(FONT_REGULAR);
      doc.text(`Beneficiar: ${party2.company || party2.name || 'N/A'}`);
      doc.text(`Reprezentant: ${party2.name || 'N/A'}`);
      doc.text(`Email: ${party2.email || 'N/A'}`);
      doc.moveDown(0.5);
      doc.text(`Prestator: ${party1.company || party1.name || 'N/A'}`);
      doc.text(`Reprezentant: ${party1.name || 'N/A'}`);
      doc.text(`Email: ${party1.email || 'N/A'}`);
      doc.moveDown(1);

      doc.fontSize(11).font(FONT_BOLD).text('2. OBIECTUL', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font(FONT_REGULAR);
      doc.text(`Titlu proiect: ${project.title || 'N/A'}`);
      doc.text(`ID Proiect: ${project.id}`);
      doc.moveDown(1);

      doc.fontSize(11).font(FONT_BOLD).text('3. SITUAȚIA FINANCIARĂ', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font(FONT_REGULAR);
      doc.text(`Valoarea totală a proiectului: ${project.budget_ron || 0} RON`);
      doc.text(`Suma eliberată către Prestator: ${escrow?.released_to_expert_total_ron || 0} RON`);
      doc.text(`Comision platformă (ESCRO): ${escrow?.claudiu_earned_total_ron || 0} RON`);
      doc.moveDown(1);

      doc.fontSize(11).font(FONT_BOLD).text('4. CONFIRMAREA FINALIZĂRII', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font(FONT_REGULAR);
      doc.text('Ambele părți confirmă că:');
      doc.text('- Serviciile au fost executate conform specificațiilor');
      doc.text('- Toate deliverabilele au fost livrate și acceptate');
      doc.text('- Nu există obiecții sau pretenții rămase nerezolvate');
      doc.text('- Proiectul este finalizat cu succes');
      doc.moveDown(2);

      if (doc.y > doc.page.height - 220) doc.addPage();
      drawSectionHeader(doc, '5. Semnături finale');
      drawParagraph(doc, 'Prin semnarea procesului-verbal de finalizare, părțile confirmă recepția integrală a livrabilelor și încheierea proiectului.');
      drawSignatures(doc, party1, party2, {
        party1Signature: contract.party1_signature,
        party1SignedAt: contract.party1_signed_at || contract.party1_accepted_at,
        party2Signature: contract.party2_signature,
        party2SignedAt: contract.party2_signed_at || contract.party2_accepted_at,
      });

      drawFineFooter(doc);

      doc.end();

      writeStream.on('finish', () => {
        const pdfUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/contracts/${fileName}`;
        resolve(pdfUrl);
      });

      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

export const generateInvoicePDF = async ({ milestone, project, client, expert, invoiceNumber }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = `invoice-${milestone.id}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: `Confirmare plată ${invoiceNumber}`,
          Author: 'ESCRO Platform',
          Subject: 'Confirmare eliberare fonduri escrow'
        }
      });

      registerUnicodeFonts(doc);

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const blue = '#1a56db';
      const green = '#057a55';
      const lightBlue = '#e8f0fe';
      const lightGreen = '#e6f4ea';

      // ── Header bar ──────────────────────────────────────────────────────────
      doc.rect(doc.page.margins.left, 40, pageWidth, 6).fill(blue);
      doc.moveDown(0.3);

      // Branding + invoice number block
      const headerY = 60;
      doc.fontSize(22).font(FONT_BOLD).fillColor(blue).text('ESCRO', doc.page.margins.left, headerY);
      doc.fontSize(9).font(FONT_REGULAR).fillColor('#555').text('Platformă escrow servicii profesionale', doc.page.margins.left, headerY + 26);

      const invRightX = doc.page.margins.left + pageWidth - 160;
      doc.fontSize(9).font(FONT_REGULAR).fillColor('#333').text('CONFIRMARE PLATĂ', invRightX, headerY, { width: 160, align: 'right' });
      doc.fontSize(13).font(FONT_BOLD).fillColor(blue).text(`#${invoiceNumber}`, invRightX, headerY + 14, { width: 160, align: 'right' });
      const invoiceDate = milestone.released_at
        ? new Date(milestone.released_at).toLocaleDateString('ro-RO')
        : new Date().toLocaleDateString('ro-RO');
      doc.fontSize(9).font(FONT_REGULAR).fillColor('#555').text(`Data: ${invoiceDate}`, invRightX, headerY + 32, { width: 160, align: 'right' });

      doc.rect(doc.page.margins.left, 105, pageWidth, 1).fill('#ddd');
      doc.moveDown(0.5);

      // ── Party boxes ──────────────────────────────────────────────────────────
      const boxY = 120;
      const boxW = (pageWidth - 20) / 2;
      const boxH = 90;

      // Client box (blue)
      doc.rect(doc.page.margins.left, boxY, boxW, boxH).fill(lightBlue);
      doc.fillColor(blue).fontSize(8).font(FONT_BOLD)
        .text('BENEFICIAR (CLIENT)', doc.page.margins.left + 10, boxY + 10);
      doc.fillColor('#222').fontSize(10).font(FONT_BOLD)
        .text(client.name || 'N/A', doc.page.margins.left + 10, boxY + 24);
      doc.fontSize(9).font(FONT_REGULAR).fillColor('#444')
        .text(client.email || '', doc.page.margins.left + 10, boxY + 38)
        .text(client.phone || '', doc.page.margins.left + 10, boxY + 50)
        .text(client.company || '', doc.page.margins.left + 10, boxY + 62);

      // Expert box (green)
      const col2X = doc.page.margins.left + boxW + 20;
      doc.rect(col2X, boxY, boxW, boxH).fill(lightGreen);
      doc.fillColor(green).fontSize(8).font(FONT_BOLD)
        .text('PRESTATOR (EXPERT)', col2X + 10, boxY + 10);
      doc.fillColor('#222').fontSize(10).font(FONT_BOLD)
        .text(expert.name || 'N/A', col2X + 10, boxY + 24);
      doc.fontSize(9).font(FONT_REGULAR).fillColor('#444')
        .text(expert.email || '', col2X + 10, boxY + 38)
        .text(expert.phone || '', col2X + 10, boxY + 50)
        .text(expert.company || '', col2X + 10, boxY + 62);

      // ── Service details table ─────────────────────────────────────────────
      const tableY = boxY + boxH + 24;
      doc.rect(doc.page.margins.left, tableY, pageWidth, 22).fill(blue);
      doc.fillColor('#fff').fontSize(9).font(FONT_BOLD)
        .text('DETALII SERVICIU', doc.page.margins.left + 10, tableY + 7);

      const rows = [
        ['Proiect', project.title || 'N/A'],
        ['Milestone', milestone.title || 'N/A'],
        ['Data livrare', milestone.delivered_at ? new Date(milestone.delivered_at).toLocaleDateString('ro-RO') : 'N/A'],
        ['Data aprobare', milestone.approved_at ? new Date(milestone.approved_at).toLocaleDateString('ro-RO') : invoiceDate],
        ['Status', 'Aprobat — fonduri eliberate'],
      ];

      let rowY = tableY + 22;
      rows.forEach(([label, value], i) => {
        const bg = i % 2 === 0 ? '#f9fafb' : '#fff';
        doc.rect(doc.page.margins.left, rowY, pageWidth, 20).fill(bg);
        doc.fillColor('#555').fontSize(9).font(FONT_BOLD)
          .text(label, doc.page.margins.left + 10, rowY + 6, { width: 140 });
        doc.fillColor('#222').fontSize(9).font(FONT_REGULAR)
          .text(value, doc.page.margins.left + 155, rowY + 6, { width: pageWidth - 165 });
        rowY += 20;
      });

      // ── Financial table ───────────────────────────────────────────────────
      const finY = rowY + 20;
      doc.rect(doc.page.margins.left, finY, pageWidth, 22).fill(blue);
      doc.fillColor('#fff').fontSize(9).font(FONT_BOLD)
        .text('DETALII FINANCIARE', doc.page.margins.left + 10, finY + 7);

      const grossAmount = parseFloat(milestone.amount || 0);
      const commissionRate = parseFloat(milestone.commission_rate || 10) / 100;
      const commissionAmount = grossAmount * commissionRate;
      const netAmount = grossAmount - commissionAmount;

      const finRows = [
        ['Valoare brută milestone', `${grossAmount.toFixed(2)} RON`],
        [`Comision platformă (${(commissionRate * 100).toFixed(0)}%)`, `- ${commissionAmount.toFixed(2)} RON`],
      ];

      let finRowY = finY + 22;
      finRows.forEach(([label, value], i) => {
        const bg = i % 2 === 0 ? '#f9fafb' : '#fff';
        doc.rect(doc.page.margins.left, finRowY, pageWidth, 20).fill(bg);
        doc.fillColor('#555').fontSize(9).font(FONT_BOLD)
          .text(label, doc.page.margins.left + 10, finRowY + 6, { width: 280 });
        doc.fillColor('#222').fontSize(9).font(FONT_REGULAR)
          .text(value, doc.page.margins.left + 300, finRowY + 6, { width: pageWidth - 310, align: 'right' });
        finRowY += 20;
      });

      // Total row
      doc.rect(doc.page.margins.left, finRowY, pageWidth, 28).fill(blue);
      doc.fillColor('#fff').fontSize(11).font(FONT_BOLD)
        .text('TOTAL ELIBERAT EXPERT', doc.page.margins.left + 10, finRowY + 8, { width: 280 });
      doc.fillColor('#fff').fontSize(11).font(FONT_BOLD)
        .text(`${netAmount.toFixed(2)} RON`, doc.page.margins.left + 300, finRowY + 8, { width: pageWidth - 310, align: 'right' });

      // ── Footer ────────────────────────────────────────────────────────────
      const footerY = finRowY + 50;
      doc.rect(doc.page.margins.left, footerY, pageWidth, 1).fill('#ddd');
      doc.fillColor('#888').fontSize(8).font(FONT_REGULAR)
        .text(
          'Acest document confirmă eliberarea fondurilor din contul escrow ESCRO. Nu constituie factură fiscală.',
          doc.page.margins.left, footerY + 8, { width: pageWidth, align: 'center' }
        );
      doc.text(`Document generat automat de platforma ESCRO • ${new Date().toLocaleDateString('ro-RO')}`,
        doc.page.margins.left, footerY + 20, { width: pageWidth, align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        const pdfUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/invoices/${fileName}`;
        resolve(pdfUrl);
      });

      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};
