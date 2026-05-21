// Quick SMTP smoke test. Run with:
//   node scripts/testEmail.js you@example.com
//
// Verifies the EMAIL_* env vars in .env are correct by sending one test email
// through the same nodemailer transport the app uses in production.

import '../config/loadEnv.js';
import { sendEmail } from '../services/emailService.js';

const to = process.argv[2];

if (!to) {
  console.error('Usage: node scripts/testEmail.js <recipient@example.com>');
  process.exit(1);
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('EMAIL_USER and EMAIL_PASS must be set in .env');
  process.exit(1);
}

console.log(`[testEmail] Sending test email to ${to} via ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);

const result = await sendEmail({
  to,
  toName: 'Test User',
  template: 'contractPendingSignature',
  data: {
    name: 'Test User',
    projectTitle: 'Proiect Test SMTP',
    contractType: 'Contract de test',
    projectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/project/test`,
  },
});

if (result.success) {
  console.log('[testEmail] OK — emailul a plecat. Verifică inbox (și folderul Spam).');
  process.exit(0);
} else {
  console.error(`[testEmail] FAILED — ${result.reason}`);
  process.exit(2);
}
