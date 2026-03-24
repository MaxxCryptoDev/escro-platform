import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateTrustSystemPresentation = (outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text('Sistem Unificat Trust Level', {
      align: 'center'
    });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text('Prezentare Tehnică - ESCRO Platform', {
      align: 'center'
    });
    doc.moveDown(2);

    // Section 1: Overview
    doc.fontSize(18).font('Helvetica-Bold').text('1. Prezentare Generală');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Sistemul de Trust Level oferă o metodă unificată de verificare și clasificare a utilizatorilor pe platformă, aplicabil atât pentru Experți cât și pentru Companii. Sistemul este automat, scalabil și recalculabil.', { align: 'justify' });
    doc.moveDown();

    // Section 2: Trust Levels
    doc.fontSize(18).font('Helvetica-Bold').text('2. Niveluri de Încredere');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Sistemul utilizează 5 niveluri de încredere:');
    doc.moveDown(0.5);
    
    const levels = [
      { level: 'Nivel 5', score: '≥80', desc: 'Expert verificat complet - Recomandat' },
      { level: 'Nivel 4', score: '≥60', desc: 'Foarte de încredere' },
      { level: 'Nivel 3', score: '≥40', desc: 'Încredere medie' },
      { level: 'Nivel 2', score: '≥20', desc: 'Încredere minimă' },
      { level: 'Nivel 1', score: '<20', desc: 'Încredere scăzută - Fără verificări' }
    ];

    levels.forEach(l => {
      doc.font('Helvetica-Bold').text(`${l.level}: ${l.score} puncte`, { continued: true });
      doc.font('Helvetica').text(` - ${l.desc}`);
    });
    doc.moveDown();

    // Section 3: Trust Score Calculation
    doc.fontSize(18).font('Helvetica-Bold').text('3. Calculul Scorului de Încredere');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    
    const factors = [
      { factor: 'verified_identity', points: 20, desc: 'KYC verificat de admin' },
      { factor: 'profile_completed', points: 15, desc: 'Profil complet (nume, email, telefon, expertiză)' },
      { factor: 'accepted_master_contract', points: 15, desc: 'Contract master acceptat' },
      { factor: 'recommended_by_user', points: 10, desc: 'Recomandat de alt utilizator' },
      { factor: 'recommended_by_company', points: 10, desc: 'Recomandat de o companie' },
      { factor: 'has_direct_collaboration', points: 10, desc: 'Colaborare directă cu alți utilizatori' },
      { factor: 'is_known_directly_by_admin', points: 10, desc: 'Verificat direct de admin' },
      { factor: 'portfolio_completed', points: 10, desc: 'Portofoliu cu minim 3 proiecte' }
    ];

    doc.text('Factori de verificare și punctaj:');
    doc.moveDown(0.5);
    
    factors.forEach(f => {
      doc.font('Helvetica-Bold').text(`${f.points} puncte: `, { continued: true });
      doc.font('Helvetica').text(f.desc);
    });
    doc.moveDown();

    // Section 4: Database Schema
    doc.fontSize(18).font('Helvetica-Bold').text('4. Structura Datelor');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Tabele principale create:');
    doc.moveDown(0.5);
    
    const tables = [
      'trust_profiles - Profilul principal de încredere',
      'trust_profile_history - Istoric modificări pentru audit',
      'master_contracts - Contracte master acceptate',
      'direct_collaborations - Colaborări directe între utilizatori',
      'referral_codes - Coduri unice de referire',
      'referrals - Trackuire referiri între utilizatori',
      'referral_settings - Configurație bonusuri'
    ];

    tables.forEach(t => {
      doc.text(`• ${t}`);
    });
    doc.moveDown();

    // Section 5: API Endpoints
    doc.fontSize(18).font('Helvetica-Bold').text('5. API Endpoints');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Trust Profiles:');
    doc.moveDown(0.3);
    
    const trustEndpoints = [
      'GET /api/trust-profiles/:userId - Profil public',
      'GET /api/trust-profiles/my-trust-profile - Profil propriu',
      'POST /api/trust-profiles/recalculate/:userId - Recalculare (admin)',
      'POST /api/trust-profiles/admin-verify/:userId - Verificare admin',
      'POST /api/trust-profiles/accept-master-contract - Acceptă contract',
      'GET /api/trust-profiles/admin/all - Toate profilele (admin)'
    ];

    trustEndpoints.forEach(e => {
      doc.text(`  • ${e}`);
    });
    doc.moveDown();

    doc.text('Referrals:');
    doc.moveDown(0.3);
    
    const referralEndpoints = [
      'GET /api/referrals/my-referral-info - Info cod personal',
      'GET /api/referrals/code/:code - Verificare cod (public)',
      'POST /api/referrals/validate - Validează cod',
      'GET /api/referrals/my-referrals - Lista referați',
      'POST /api/auth/register?referral_code=XXX - Înregistrare cu cod'
    ];

    referralEndpoints.forEach(e => {
      doc.text(`  • ${e}`);
    });
    doc.moveDown();

    // Section 6: Automatic Triggers
    doc.fontSize(18).font('Helvetica-Bold').text('6. Trigger-uri Automatice');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Sistemul recalculează automat trust profile în următoarele situații:');
    doc.moveDown(0.5);
    
    const triggers = [
      'Înregistrare utilizator nou (expert/company)',
      'Verificare KYC de către admin',
      'Acceptare contract master',
      'Adăugare portfolio (3+ proiecte)',
      'Actualizare profil',
      'Verificare admin (mark as known)',
      'Adăugare colaborare directă',
      'Finalizare proiect'
    ];

    triggers.forEach(t => {
      doc.text(`• ${t}`);
    });
    doc.moveDown();

    // Section 7: Referral System
    doc.fontSize(18).font('Helvetica-Bold').text('7. Sistem de Referire');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Funcționalități:', { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.text('• Cod unic de referire generat automat pentru fiecare utilizator');
    doc.text('• Tracking complet al refererilor (înregistrare, verificare, completare)');
    doc.text('• Bonusuri trust configurabile pentru ambele părți');
    doc.text('• Statistici detaliate pentru utilizatori și admin');
    doc.moveDown();

    // Section 8: Integration
    doc.fontSize(18).font('Helvetica-Bold').text('8. Integrare în Platformă');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Fișiere modificate/create:', { align: 'justify' });
    doc.moveDown(0.5);
    
    const files = [
      'backend/scripts/createTrustProfiles.sql - Tabele trust',
      'backend/scripts/createReferralSystem.sql - Tabele referire',
      'backend/services/trustProfileService.js - Serviciu calcul trust',
      'backend/services/trustProfileHooks.js - Hook-uri automate',
      'backend/services/trustProfileInit.js - Inițializare profile',
      'backend/services/referralService.js - Serviciu referire',
      'backend/routes/trustProfile.js - API trust',
      'backend/routes/referral.js - API referire',
      'backend/controllers/authController.js - Integrare înregistrare',
      'backend/controllers/userController.js - Trigger actualizare',
      'backend/controllers/adminController.js - Trigger KYC',
      'backend/controllers/contractController.js - Trigger proiecte'
    ];

    files.forEach(f => {
      doc.text(`• ${f}`);
    });
    doc.moveDown(2);

    // Footer
    doc.fontSize(10).font('Helvetica');
    doc.text('Document generat automat - ESCRO Platform Trust System', {
      align: 'center'
    });

    doc.end();
    
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};

export const generateTrustSystemPresentationBuffer = () => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Same content as file version
    doc.fontSize(24).font('Helvetica-Bold').text('Sistem Unificat Trust Level', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text('Prezentare Tehnică - ESCRO Platform', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('1. Prezentare Generală');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Sistemul de Trust Level oferă o metodă unificată de verificare și clasificare a utilizatorilor pe platformă, aplicabil atât pentru Experți cât și pentru Companii.', { align: 'justify' });
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('2. Niveluri de Încredere');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('Nivel 5: ≥80 puncte - Expert verificat complet (Recomandat)');
    doc.text('Nivel 4: ≥60 puncte - Foarte de încredere');
    doc.text('Nivel 3: ≥40 puncte - Încredere medie');
    doc.text('Nivel 2: ≥20 puncte - Încredere minimă');
    doc.text('Nivel 1: <20 puncte - Încredere scăzută');
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('3. Calculul Scorului');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('verified_identity: 20 puncte');
    doc.text('profile_completed: 15 puncte');
    doc.text('accepted_master_contract: 15 puncte');
    doc.text('recommended_by_user/company: 10 puncte');
    doc.text('has_direct_collaboration: 10 puncte');
    doc.text('is_known_directly_by_admin: 10 puncte');
    doc.text('portfolio_completed: 10 puncte');
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('4. Sistem de Referire');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('• Cod unic de referire generat automat');
    doc.text('• Tracking referiri: registered → verified → completed');
    doc.text('• Bonusuri: referrer=10 puncte, referred=15 puncte');
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('5. Trigger-uri Automatice');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text('• Înregistrare utilizator');
    doc.text('• Verificare KYC');
    doc.text('• Acceptare contract master');
    doc.text('• Adăugare portfolio');
    doc.text('• Actualizare profil');
    doc.text('• Finalizare proiect');

    doc.end();
  });
};
