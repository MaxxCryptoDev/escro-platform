import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export const generateUserContractPDF = async (userData) => {
  const { name, email, phone, company, cui, industry, expertise, experience, role } = userData;
  
  const contractDir = path.join(UPLOAD_DIR, 'user-contracts');
  if (!fs.existsSync(contractDir)) {
    fs.mkdirSync(contractDir, { recursive: true });
  }

  const filename = `contract_${Date.now()}.pdf`;
  const filepath = path.join(contractDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text('CONTRACT DE UTILIZARE PLATFORMĂ ESCRO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('1. PĂRȚILE CONTRACTANTE');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `Prezentul Contract de Utilizare („Contractul") este încheiat între:`,
      { continued: false }
    );
    doc.moveDown(0.5);
    doc.text(`Platforma ESCRO, cu sediul în România, reprezentată prin Administrator`);
    doc.moveDown();
    doc.text(`Și`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`${name}`);
    doc.font('Helvetica').text(`Email: ${email}`);
    if (phone) doc.text(`Telefon: ${phone}`);
    if (company) doc.text(`Companie: ${company}`);
    if (cui) doc.text(`CUI: ${cui}`);
    if (industry) doc.text(`Industrie: ${industry}`);
    doc.text(`Domeniu/Expertiză: ${expertise}`);
    doc.text(`Experiență: ${experience} ani`);
    doc.text(`Tip cont: ${role === 'expert' ? 'Expert' : 'Client/Companie'}`);
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('2. OBIECTUL CONTRACTULUI');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `2.1. Obiectul prezentului Contract îl reprezintă utilizarea platformei ESCRO de către Utilizator în conformitate cu Termenii și Condițiile prezentate pe platformă.`
    );
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('3. DREPTURILE ȘI OBLIGAȚIILE PĂRȚILOR');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `3.1. Utilizatorul se obligă să furnizeze informații corecte și complete la crearea contului.`
    );
    doc.moveDown(0.5);
    doc.text(
      `3.2. Utilizatorul se obligă să respecte Termenii și Condițiile platformei ESCRO.`
    );
    doc.moveDown(0.5);
    doc.text(
      `3.3. Platforma ESCRO se obligă să asigure confidențialitatea datelor personale ale Utilizatorului.`
    );
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('4. CONFidențialitate');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `4.1. Platforma ESCRO se angajează să protejeze datele personale ale Utilizatorului în conformitate cu Regulamentul General privind Protecția Datelor (GDPR).`
    );
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('5. DURATA CONTRACTULUI');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `5.1. Prezentul Contract intră în vigoare la data creării contului de utilizator și rămâne valabil pe întreaga durată a utilizării platformei.`
    );
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('6. DISPOZIȚII FINALE');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `6.1. Prezentul Contract este guvernat de legislația română în vigoare.`
    );
    doc.moveDown(0.5);
    doc.text(
      `6.2. Orice litigiu va fi soluționat de instanțele competente din România.`
    );
    doc.moveDown(3);

    doc.fontSize(11).font('Helvetica-Bold').text('SEMNĂTURI:', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(10).font('Helvetica');
    doc.text('Platforma ESCRO:', { continued: false });
    doc.moveDown(2);
    doc.text('_________________________', { align: 'left' });
    doc.text('Administrator');
    doc.moveDown(2);
    doc.text('Utilizator:', { continued: false });
    doc.moveDown(2);
    doc.text('_________________________');
    doc.text(`${name}`);
    doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`);

    doc.end();

    stream.on('finish', () => {
      resolve(`/uploads/user-contracts/${filename}`);
    });

    stream.on('error', reject);
  });
};

export const generateContractNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `USR-${year}-${random}`;
};
