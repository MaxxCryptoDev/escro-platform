import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null; // email not configured — log only
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 28px 32px; }
  .header-title { color: white; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
  .header-sub { color: rgba(255,255,255,0.75); font-size: 13px; margin: 4px 0 0; }
  .body { padding: 32px; }
  .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .btn { display: inline-block; background: #2563eb; color: white !important; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0; }
  .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .info-box p { margin: 0; color: #0369a1; font-size: 14px; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  .footer p { color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5; }
  .amount { font-family: 'Courier New', monospace; font-weight: 700; color: #059669; font-size: 18px; }
  .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .warning p { margin: 0; color: #92400e; font-size: 14px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <p class="header-title">ESCRO</p>
    <p class="header-sub">Platforma de escrow pentru servicii profesionale</p>
  </div>
  <div class="body">
    ${content}
  </div>
  <div class="footer">
    <p>Acest email a fost trimis automat de platforma ESCRO. Nu răspunde la acest email.<br>
    Dacă nu ai solicitat această acțiune, poți ignora mesajul.</p>
  </div>
</div>
</body>
</html>
`;

const templates = {
  passwordReset: ({ name, resetUrl }) => ({
    subject: 'Resetare parolă — ESCRO',
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Am primit o cerere de resetare a parolei pentru contul tău ESCRO.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${resetUrl}" class="btn">Resetează parola</a>
      </p>
      <div class="warning">
        <p>⏰ Acest link este valabil <strong>1 oră</strong> și poate fi folosit o singură dată.</p>
      </div>
      <p style="color:#6b7280; font-size:13px;">Dacă nu ai solicitat resetarea parolei, ignoră acest email. Parola ta rămâne neschimbată.</p>
    `),
  }),

  contractPendingSignature: ({ name, projectTitle, contractType, projectUrl }) => ({
    subject: `Contract de semnat — ${projectTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Un <strong>${contractType}</strong> din proiectul <strong>"${projectTitle}"</strong> necesită semnătura ta.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Vizualizează și semnează contractul</a>
      </p>
      <div class="info-box">
        <p>ℹ️ Proiectul nu poate continua până când ambele părți semnează contractul.</p>
      </div>
    `),
  }),

  milestoneDelivered: ({ name, projectTitle, milestoneTitle, projectUrl }) => ({
    subject: `Milestone livrat — ${milestoneTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Prestatorul a marcat ca livrat milestone-ul <strong>"${milestoneTitle}"</strong> din proiectul <strong>"${projectTitle}"</strong>.</p>
      <p>Verifică livrabilele și aprobă sau deschide o dispută dacă ceva nu este conform.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Verifică milestone-ul</a>
      </p>
      <div class="warning">
        <p>⚠️ Fondurile escrow sunt blocate până la aprobarea ta. Verifică în cel mai scurt timp.</p>
      </div>
    `),
  }),

  milestoneApproved: ({ name, projectTitle, milestoneTitle, amountRon, projectUrl }) => ({
    subject: `Plată eliberată — ${fmtRON(amountRon)} RON`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Milestone-ul <strong>"${milestoneTitle}"</strong> din proiectul <strong>"${projectTitle}"</strong> a fost aprobat.</p>
      <div class="info-box">
        <p>💰 Suma de <span class="amount">${fmtRON(amountRon)} RON</span> a fost eliberată în portofelul tău.</p>
      </div>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Vizualizează proiectul</a>
      </p>
    `),
  }),

  revisionRequested: ({ name, projectTitle, milestoneTitle, feedback, projectUrl }) => ({
    subject: `Revizuire solicitată — ${milestoneTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Beneficiarul a solicitat revizuire pentru milestone-ul <strong>"${milestoneTitle}"</strong> din proiectul <strong>"${projectTitle}"</strong>.</p>
      <div class="info-box">
        <p><strong>Feedback:</strong></p>
        <p>${feedback}</p>
      </div>
      <p>Analizează feedback-ul, fă ajustările necesare și redelivrează milestone-ul.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Mergi la proiect</a>
      </p>
    `),
  }),

  projectApproved: ({ name, projectTitle, projectUrl }) => ({
    subject: `Proiect aprobat — ${projectTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Proiectul tău <strong>"${projectTitle}"</strong> a fost aprobat de administrator.</p>
      <p>Poți semna acum contractul și demara colaborarea.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Mergi la proiect</a>
      </p>
    `),
  }),

  projectRejected: ({ name, projectTitle, reason }) => ({
    subject: `Proiect respins — ${projectTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Proiectul <strong>"${projectTitle}"</strong> a fost respins de administrator.</p>
      ${reason ? `<div class="warning"><p>Motiv: ${reason}</p></div>` : ''}
      <p>Poți crea un nou proiect cu modificările necesare.</p>
    `),
  }),

  payoutApproved: ({ name, amountRon }) => ({
    subject: `Cerere retragere aprobată — ${fmtRON(amountRon)} RON`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Cererea ta de retragere de <span class="amount">${fmtRON(amountRon)} RON</span> a fost aprobată și este în procesare.</p>
      <div class="info-box">
        <p>ℹ️ Fondurile vor fi transferate în contul tău bancar în 1-3 zile lucrătoare.</p>
      </div>
    `),
  }),

  payoutPaid: ({ name, amountRon }) => ({
    subject: `Retragere efectuată — ${fmtRON(amountRon)} RON`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Suma de <span class="amount">${fmtRON(amountRon)} RON</span> a fost transferată în contul tău bancar.</p>
      <div class="info-box">
        <p>✅ Tranzacția a fost procesată cu succes.</p>
      </div>
    `),
  }),

  payoutRejected: ({ name, amountRon, reason }) => ({
    subject: `Cerere retragere respinsă`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Cererea ta de retragere de <span class="amount">${fmtRON(amountRon)} RON</span> a fost respinsă.</p>
      ${reason ? `<div class="warning"><p>Motiv: ${reason}</p></div>` : ''}
      <p>Contactează suportul dacă crezi că este o eroare.</p>
    `),
  }),

  disputeOpened: ({ name, projectTitle, milestoneTitle, projectUrl }) => ({
    subject: `Dispută deschisă — ${milestoneTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>A fost deschisă o dispută pe milestone-ul <strong>"${milestoneTitle}"</strong> din proiectul <strong>"${projectTitle}"</strong>.</p>
      <p>Administratorul va analiza situația și va lua o decizie. Poți trimite dovezi suplimentare din platforma.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Mergi la dispută</a>
      </p>
      <div class="info-box">
        <p>ℹ️ Fondurile escrow rămân blocate până la rezolvarea disputei.</p>
      </div>
    `),
  }),

  disputeResolved: ({ name, projectTitle, milestoneTitle, amountRon, decision, projectUrl }) => ({
    subject: `Dispută rezolvată — ${milestoneTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Disputa pe milestone-ul <strong>"${milestoneTitle}"</strong> din proiectul <strong>"${projectTitle}"</strong> a fost rezolvată.</p>
      <div class="info-box">
        <p>Decizia administratorului: ${decision || 'Rezolvat'}<br>
        ${amountRon > 0 ? `Suma eliberată: <strong>${fmtRON(amountRon)} RON</strong>` : ''}</p>
      </div>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Vizualizează decizia</a>
      </p>
    `),
  }),

  userApproved: ({ name }) => ({
    subject: 'Cont verificat — Bun venit pe ESCRO!',
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>🎉 Contul tău a fost <strong>verificat și aprobat</strong> de echipa ESCRO!</p>
      <p>Acum poți accesa toate funcționalitățile platformei: poți crea proiecte, semna contracte și gestiona plăți escrow.</p>
      <div class="info-box">
        <p>✅ Ai primit puncte Trust suplimentare pentru verificarea KYC.</p>
      </div>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Mergi la dashboard</a>
      </p>
    `),
  }),

  userRejected: ({ name, reason }) => ({
    subject: 'Verificare cont respinsă — ESCRO',
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Din păcate, verificarea contului tău a fost respinsă.</p>
      ${reason ? `<div class="warning"><p>Motiv: ${reason}</p></div>` : ''}
      <p>Contactează suportul la <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a> pentru detalii.</p>
    `),
  }),

  taskAcceptanceRequired: ({ name, projectTitle, projectUrl, invitationMessage }) => ({
    subject: `Task nou de acceptat — ${projectTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>${invitationMessage || `Ai primit o invitație pentru taskul <strong>"${projectTitle}"</strong>.`}</p>
      <p>Verifică detaliile și acceptă sau respinge invitația pentru a demara colaborarea.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Vezi taskul</a>
      </p>
      <div class="info-box">
        <p>ℹ️ Răspunde cât mai curând — clientul așteaptă confirmarea ta înainte de a continua.</p>
      </div>
    `),
  }),

  modificationProposed: ({ name, projectTitle, fieldOrMilestone, projectUrl }) => ({
    subject: `Modificare propusă — ${projectTitle}`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>Pe proiectul <strong>"${projectTitle}"</strong> a fost propusă o modificare la <strong>${fieldOrMilestone}</strong>.</p>
      <p>Trebuie să aprobi sau să respingi modificarea pentru ca proiectul să continue.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Vezi modificarea</a>
      </p>
      <div class="warning">
        <p>⚠️ Modificarea nu se aplică până când nu o aprobi explicit.</p>
      </div>
    `),
  }),

  prestatorAccepted: ({ name, projectTitle, prestatorName, projectUrl }) => ({
    subject: `Ai un prestator pentru "${projectTitle}"`,
    html: baseTemplate(`
      <p>Salut, <strong>${name}</strong>,</p>
      <p>${prestatorName ? `<strong>${prestatorName}</strong> a` : 'Prestatorul a'} acceptat proiectul tău <strong>"${projectTitle}"</strong>.</p>
      <p>Următorul pas: semnați contractul de proiect și puteți demara colaborarea.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a href="${projectUrl}" class="btn">Mergi la proiect</a>
      </p>
      <div class="info-box">
        <p>ℹ️ Contractul trebuie semnat de ambele părți înainte de finanțarea primei etape.</p>
      </div>
    `),
  }),
};

function fmtRON(amount) {
  const n = parseFloat(amount) || 0;
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' RON';
}

export async function sendEmail({ to, toName, template, data }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[EMAIL] Not configured — would send "${template}" to ${to}`);
    return { success: false, reason: 'not_configured' };
  }

  const tmpl = templates[template];
  if (!tmpl) {
    console.error(`[EMAIL] Unknown template: ${template}`);
    return { success: false, reason: 'unknown_template' };
  }

  const { subject, html } = tmpl(data);
  const fromName = process.env.EMAIL_FROM_NAME || 'ESCRO Platform';
  const fromAddr = process.env.EMAIL_FROM || 'noreply@escro.ro';

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent "${template}" to ${to}`);
    return { success: true };
  } catch (err) {
    console.error(`[EMAIL] Failed to send "${template}" to ${to}:`, err.message);
    return { success: false, reason: err.message };
  }
}

export async function sendEmailIfEnabled(pool, userId, template, data) {
  try {
    const r = await pool.query(
      'SELECT email, name, email_notifications FROM users WHERE id = $1',
      [userId]
    );
    if (!r.rows.length) return;
    const { email, name, email_notifications } = r.rows[0];
    if (email_notifications === false) return;
    await sendEmail({ to: email, toName: name, template, data: { ...data, name } });
  } catch (err) {
    console.error(`[EMAIL] sendEmailIfEnabled error for user ${userId}:`, err.message);
  }
}
