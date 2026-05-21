import './config/loadEnv.js'; // Must be first — loads .env before any other module reads process.env

// Sentry must be initialized BEFORE other imports for instrumentation to work
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  });
  // logger not yet imported — console.log is acceptable for boot-stage messages
  console.log('[STARTUP] Sentry: enabled');
}

import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { createServer } from 'http';
import { initSocket } from './socket.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwtLib from 'jsonwebtoken';
import { logger, httpLogger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, 'uploads', 'deliverables');
const chatUploadsDir = path.join(__dirname, 'uploads', 'chat');
const evidenceUploadsDir = path.join(__dirname, 'uploads', 'evidence');
const userContractsDir = path.join(__dirname, 'uploads', 'user-contracts');
const contractsDir = path.join(__dirname, 'uploads', 'contracts');
const invoicesDir = path.join(__dirname, 'uploads', 'invoices');
for (const dir of [uploadsDir, chatUploadsDir, evidenceUploadsDir, userContractsDir, contractsDir, invoicesDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Configure multer for deliverable uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deliverable-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'video/mp4', 'video/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Evidence upload config
const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, evidenceUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const evidenceUpload = multer({
  storage: evidenceStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','video/mp4','video/webm'].includes(file.mimetype);
    cb(ok ? null : new Error('Tip de fișier nepermis.'), ok);
  }
});

// Chat file upload config
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-zip-compressed',
      'text/plain'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tip de fișier nepermis.'));
    }
  }
});

logger.info({
  cwd: process.cwd(),
  envPath: path.join(__dirname, '.env'),
  jwtSecret: process.env.JWT_SECRET ? 'set' : 'missing',
  dbPassword: process.env.DB_PASSWORD ? 'set' : 'missing',
  nodeEnv: process.env.NODE_ENV || 'development',
}, '[STARTUP] booting');

const REQUIRED_ENV = ['JWT_SECRET', 'DB_PASSWORD'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  logger.fatal({ missing: missingEnv }, 'Missing required environment variables — exiting');
  process.exit(1);
}

import errorHandler from './middleware/errorHandler.js';
import { protect, adminOnly } from './middleware/auth.js';
import pool from './config/database.js';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import verificationRoutes from './routes/verification.js';
// taskRequestRoutes removed — bid/proposal flow not part of platform (per product decision)
import expertPostedTaskRoutes from './routes/expertPostedTask.js';
import clientPostedTaskRoutes from './routes/clientPostedTask.js';
import trustProfileRoutes from './routes/trustProfile.js';
import referralRoutes from './routes/referral.js';
import reviewRoutes from './routes/review.js';
import notificationRoutes from './routes/notifications.js';
import walletRoutes from './routes/wallet.js';
import stripeRoutes from './routes/stripe.js';
import * as stripeOnboardingController from './controllers/stripeOnboardingController.js';

// Controllers
import * as projectController from './controllers/projectController.js';
import * as milestoneController from './controllers/milestoneController.js';
import * as escrowController from './controllers/escrowController.js';
import * as messageController from './controllers/messageController.js';
import * as adminController from './controllers/adminController.js';
import { exportFinancialCsv, exportUsersCsv, exportDisputesCsv } from './controllers/adminController.js';
import * as contractController from './controllers/contractController.js';
import * as modificationController from './controllers/modificationController.js';
import * as projectManagementController from './controllers/projectManagementController.js';
import * as termsController from './controllers/termsController.js';

// Run DB migrations on startup (idempotent)
async function runMigrations() {
  try {
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS in_app_notifications BOOLEAN DEFAULT TRUE`);
    await pool.query(`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS revision_feedback TEXT`);
    // Drop and recreate milestones status constraint to include revision_requested
    await pool.query(`
      DO $$
      BEGIN
        BEGIN ALTER TABLE milestones DROP CONSTRAINT milestones_status_check; EXCEPTION WHEN undefined_object THEN NULL; END;
        BEGIN ALTER TABLE milestones DROP CONSTRAINT milestones_status_check1; EXCEPTION WHEN undefined_object THEN NULL; END;
      END$$
    `);
    await pool.query(`
      ALTER TABLE milestones ADD CONSTRAINT milestones_status_check CHECK (
        status IN ('pending','in_progress','delivered','revision_requested','approved','released','disputed','cancelled')
      )
    `);
    // Update status constraint to include pending_client_approval
    await pool.query(`
      DO $$
      BEGIN
        BEGIN ALTER TABLE projects DROP CONSTRAINT projects_status_check; EXCEPTION WHEN undefined_object THEN NULL; END;
        BEGIN ALTER TABLE projects DROP CONSTRAINT projects_status_check1; EXCEPTION WHEN undefined_object THEN NULL; END;
      END$$
    `);
    await pool.query(`
      ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (
        status IN ('pending_admin_approval','pending_client_approval','pending_assignment',
                   'pending_expert_approval','assigned','open','in_progress','delivered',
                   'completed','disputed','rejected','cancelled')
      )
    `);
    // Reviews table: rename comment→review_text, add missing columns + constraints
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='comment') THEN
          ALTER TABLE reviews RENAME COLUMN comment TO review_text;
        END IF;
      END$$
    `);
    await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_text TEXT`);
    await pool.query(`ALTER TABLE milestone_disputes ADD COLUMN IF NOT EXISTS evidence_files JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE milestone_disputes ADD COLUMN IF NOT EXISTS other_party_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE milestone_disputes ADD COLUMN IF NOT EXISTS decision_type VARCHAR(30) DEFAULT 'partial'`);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_review') THEN
          ALTER TABLE reviews ADD CONSTRAINT unique_review UNIQUE (reviewer_id, project_id);
        END IF;
      END$$
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_user_feedback TEXT`);
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
    await pool.query(`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
    // Auth: password reset tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(128) NOT NULL UNIQUE,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)`);
    // Wallet system
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(120)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_transfers_enabled BOOLEAN DEFAULT FALSE`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL,
        type VARCHAR(40) NOT NULL,
        description TEXT,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        milestone_release_id UUID REFERENCES milestone_releases(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payout_requests (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_ron NUMERIC(12,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        stripe_transfer_id VARCHAR(120),
        admin_note TEXT,
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payout_user ON payout_requests(user_id, status)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stripe_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(120) NOT NULL UNIQUE,
        event_type VARCHAR(80) NOT NULL,
        payload JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Postgres LISTEN/NOTIFY trigger: emits to socket on every INSERT into notifications
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_new_notification() RETURNS TRIGGER AS $func$
      BEGIN
        PERFORM pg_notify('new_notification', json_build_object(
          'id', NEW.id,
          'user_id', NEW.user_id,
          'type', NEW.type,
          'title', NEW.title,
          'message', NEW.message,
          'link', NEW.link,
          'is_read', NEW.is_read,
          'created_at', NEW.created_at
        )::text);
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notifications_notify_trigger') THEN
          CREATE TRIGGER notifications_notify_trigger
            AFTER INSERT ON notifications
            FOR EACH ROW EXECUTE FUNCTION notify_new_notification();
        END IF;
      END$$
    `);

    // T&C versioning: every time admin publishes a new version, all users are re-prompted
    await pool.query(`
      CREATE TABLE IF NOT EXISTS terms_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(20) NOT NULL UNIQUE,
        content TEXT NOT NULL,
        summary TEXT,
        effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
        is_current BOOLEAN NOT NULL DEFAULT FALSE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Only one row can be current — partial unique index
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_terms_current_unique ON terms_versions(is_current) WHERE is_current = TRUE`);
    // User acceptance tracking
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_version VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP`);
    // Seed initial v1.0 if no current exists; grandfather existing users in
    await pool.query(`
      INSERT INTO terms_versions (version, content, summary, is_current)
      SELECT '1.0',
        'Versiune inițială a Termenilor și Condițiilor ESCRO. Pentru detalii complete vizitează /terms.',
        'Versiune inițială publicată la lansarea platformei.',
        TRUE
      WHERE NOT EXISTS (SELECT 1 FROM terms_versions WHERE is_current = TRUE)
    `);
    // Grandfather existing users — runs ONCE on initial T&C seed (when only v1.0 exists).
    // After admin publishes v2.0, this no-ops. New users without accepted_terms_version
    // (e.g., from external scripts) will be prompted instead of silently auto-accepted.
    await pool.query(`
      DO $$
      BEGIN
        IF (SELECT COUNT(*) FROM terms_versions) = 1 THEN
          UPDATE users SET accepted_terms_version = (SELECT version FROM terms_versions WHERE is_current = TRUE),
                           accepted_terms_at = NOW()
          WHERE accepted_terms_version IS NULL AND deleted_at IS NULL;
        END IF;
      END$$
    `);

    // Project change history — captures all edits to project core fields (title, description, budget, timeline)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_history (
        id SERIAL PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(60) NOT NULL,
        field_name VARCHAR(60),
        old_value TEXT,
        new_value TEXT,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_history_project ON project_history(project_id, created_at DESC)`);
    // Indexes for file-level access checks in protectUploads middleware
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_milestones_deliverable_url ON milestones(deliverable_file_url) WHERE deliverable_file_url IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_contracts_pdf_url ON contracts(pdf_url) WHERE pdf_url IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_contracts_pdf_url ON user_contracts(contract_pdf_url) WHERE contract_pdf_url IS NOT NULL`);

    // Admin audit log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id SERIAL PRIMARY KEY,
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(60) NOT NULL,
        target_type VARCHAR(40) NOT NULL,
        target_id VARCHAR(120) NOT NULL,
        details JSONB,
        ip_address VARCHAR(60),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id)`);
    // Fix wallet_transactions.milestone_release_id: was INTEGER, must be UUID to match milestone_releases.id
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='wallet_transactions'
            AND column_name='milestone_release_id'
            AND data_type='integer'
        ) THEN
          ALTER TABLE wallet_transactions DROP COLUMN milestone_release_id;
          ALTER TABLE wallet_transactions ADD COLUMN milestone_release_id UUID REFERENCES milestone_releases(id) ON DELETE SET NULL;
        END IF;
      END$$
    `);
    // Extend escrow_accounts.status to include 'refunded' (used by refundEscrow + autoArchiveStaleDisputes)
    await pool.query(`
      DO $$
      BEGIN
        BEGIN ALTER TABLE escrow_accounts DROP CONSTRAINT escrow_accounts_status_check; EXCEPTION WHEN undefined_object THEN NULL; END;
      END$$
    `);
    await pool.query(`
      ALTER TABLE escrow_accounts ADD CONSTRAINT escrow_accounts_status_check
        CHECK (status IN ('open', 'held', 'partially_released', 'fully_released', 'refunded'))
    `);
    // Users.role check — allows admin, expert, company, individual (individual = persoană fizică, doar beneficiar).
    // Legacy 'client' role is dropped (use 'individual' instead).
    await pool.query(`
      DO $$
      BEGIN
        BEGIN ALTER TABLE users DROP CONSTRAINT users_role_check; EXCEPTION WHEN undefined_object THEN NULL; END;
      END$$
    `);
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','expert','company','individual'))
    `);
    // Ensure contract_number is unique to prevent collisions
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_contract_number_unique') THEN
          ALTER TABLE contracts ADD CONSTRAINT contracts_contract_number_unique UNIQUE (contract_number);
        END IF;
      END$$
    `);
    // Add 'apply_failed' and 'applied' to project_modifications status check if it exists
    await pool.query(`
      DO $$
      BEGIN
        BEGIN ALTER TABLE project_modifications DROP CONSTRAINT project_modifications_status_check; EXCEPTION WHEN undefined_object THEN NULL; END;
      END$$
    `);
    await pool.query(`
      ALTER TABLE project_modifications ADD CONSTRAINT project_modifications_status_check
        CHECK (status IN ('pending','approved','rejected','applied','apply_failed'))
    `).catch(() => {});
    // PM task finalization contract — between platform (admin) and beneficiary
    await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE`);
    await pool.query(`ALTER TABLE contracts ALTER COLUMN project_id DROP NOT NULL`).catch(() => {});
    // Deliverable history — every upload is preserved (revisions, re-deliveries) for dispute review
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestone_deliverable_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        file_size BIGINT,
        description TEXT,
        uploaded_by UUID REFERENCES users(id),
        version_number INTEGER NOT NULL DEFAULT 1,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mdh_milestone ON milestone_deliverable_history(milestone_id, uploaded_at DESC)`);
    // Reconcile trust_level with trust_score for any profile where they drifted (skip manual overrides)
    await pool.query(`
      UPDATE trust_profiles
      SET trust_level = LEAST(GREATEST(FLOOR(trust_score / 20)::int, 1), 5),
          updated_at = CURRENT_TIMESTAMP
      WHERE COALESCE(manual_trust_override, FALSE) = FALSE
        AND trust_level <> LEAST(GREATEST(FLOOR(trust_score / 20)::int, 1), 5)
    `).catch(e => console.warn('[trust reconcile]', e.message));
    // Referral codes are single-use: enforce on column default + on every existing row.
    // Already-used codes (usage_count >= 1) get deactivated.
    await pool.query(`ALTER TABLE referral_codes ALTER COLUMN max_uses SET DEFAULT 1`).catch(() => {});
    await pool.query(`UPDATE referral_codes SET max_uses = 1 WHERE max_uses <> 1`).catch(() => {});
    await pool.query(`UPDATE referral_codes SET is_active = FALSE WHERE usage_count >= 1 AND is_active = TRUE`).catch(() => {});
    // Stripe Connect / webhook bookkeeping
    await pool.query(`ALTER TABLE escrow_accounts ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(120)`).catch(() => {});
    await pool.query(`ALTER TABLE escrow_accounts ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(120)`).catch(() => {});
    await pool.query(`ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP`).catch(() => {});
    await pool.query(`ALTER TABLE milestone_releases ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(120)`).catch(() => {});
    await pool.query(`ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(120)`).catch(() => {});
    await pool.query(`ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`).catch(() => {});
    // PM tasks: client requests finalization → admin confirms closure
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pm_finalization_requested_at TIMESTAMP`).catch(() => {});
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pm_finalization_approved_at TIMESTAMP`).catch(() => {});
    // KYC verification call: every non-admin user must acknowledge they'll be contacted by phone
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_call_acknowledged_at TIMESTAMP`).catch(() => {});
    // 'individual' role allowed via the role-check migration above (single source of truth).
    // Grandfather: anyone with an existing verification call (scheduled or completed) is implicitly acknowledged
    await pool.query(`
      UPDATE users u
      SET verification_call_acknowledged_at = COALESCE(u.verification_call_acknowledged_at, vc.created_at)
      FROM verification_calls vc
      WHERE vc.user_id = u.id
        AND u.verification_call_acknowledged_at IS NULL
    `).catch(() => {});
    logger.info('DB migrations applied');
  } catch (err) {
    logger.fatal({ err }, 'Migration failed');
    throw err;
  }
}

const app = express();

// Trust first proxy (Nginx/Caddy) — required for accurate req.ip + rate limiting in production
app.set('trust proxy', 1);

// Structured logging with request_id correlation (skips /api/health)
app.use(httpLogger);

// Security headers + CSP — allows self + inline (Vite injects styles), websocket, and Stripe (when integrated)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://api.stripe.com'],
      fontSrc: ["'self'", 'data:'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: 'Prea multe cereri. Încearcă din nou în 15 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 200,
  message: { error: 'Prea multe cereri. Încearcă din nou.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aggressive rate-limit for password reset (anti-enumeration + anti-abuse)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Prea multe cereri de resetare. Încearcă din nou peste o oră.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}-${req.body?.email || ''}`.toLowerCase(),
});

// Money-touching endpoints — stricter per-user limit
const moneyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 15,
  message: { error: 'Prea multe operațiuni financiare. Așteaptă un minut.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Messages — per-user limit (anti-spam)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  message: { error: 'Prea multe mesaje. Așteaptă un minut.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// PDF regenerate — expensive (pdfkit + disk I/O), per-user limit
const pdfRegenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Prea multe regenerări PDF. Încearcă în maxim 1 oră.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Admin T&C publish — stricter (legal action, low volume)
const termsPublishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Prea multe publicări T&C. Așteaptă o oră.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Payout requests — even stricter (prevents wallet drain abuse)
const payoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Limita de cereri de retragere atinsă. Încearcă din nou peste o oră.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
// Stripe webhook MUST receive raw body for signature verification — mount before express.json
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeOnboardingController.handleWebhook);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static files from uploads directory
// Public: profiles, portfolio (used in directory + landing)
app.use('/uploads/profiles', express.static('uploads/profiles'));
app.use('/uploads/portfolio', express.static('uploads/portfolio'));

// Auth-required: deliverables, chat, contracts, invoices, evidence
// Verifies JWT + ensures user has access to the specific file (file-level BOLA protection).
const protectUploads = async (req, res, next) => {
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7) : null;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = headerToken || queryToken;
  if (!token) return res.status(401).send('Auth required');

  let decoded;
  try {
    decoded = jwtLib.verify(token, process.env.JWT_SECRET);
    if (queryToken && !headerToken && decoded.aud !== 'upload') {
      return res.status(401).send('Use download token (audience=upload) for query-param auth.');
    }
  } catch {
    return res.status(401).send('Invalid token');
  }

  // Admin bypass — full access
  if (decoded.role === 'admin') return next();

  // File-level access check: build the URL path that's stored in DB and find owner
  // req.baseUrl = '/uploads/contracts', req.path = '/contract-xyz.pdf'
  const fullPath = req.baseUrl + req.path; // e.g. /uploads/contracts/contract-123.pdf
  const userId = decoded.id;

  try {
    let hasAccess = false;

    if (req.baseUrl === '/uploads/deliverables') {
      const r = await pool.query(
        `SELECT 1 FROM milestones m JOIN projects p ON m.project_id = p.id
         WHERE m.deliverable_file_url LIKE $1
           AND (p.client_id = $2 OR p.expert_id = $2 OR p.company_id = $2)
         LIMIT 1`,
        [`%${fullPath}`, userId]
      );
      hasAccess = r.rows.length > 0;
    } else if (req.baseUrl === '/uploads/contracts') {
      const r = await pool.query(
        `SELECT 1 FROM contracts WHERE pdf_url LIKE $1
           AND (party1_id = $2 OR party2_id = $2) LIMIT 1`,
        [`%${fullPath}`, userId]
      );
      hasAccess = r.rows.length > 0;
    } else if (req.baseUrl === '/uploads/invoices') {
      // Invoice files are named invoice-{milestone_uuid}-{ts}.pdf (see services/contractPDF.js)
      const filename = req.path.replace(/^\//, '');
      const match = filename.match(/^invoice-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-/i);
      if (match) {
        const milestoneId = match[1];
        const r = await pool.query(
          `SELECT 1 FROM milestones m JOIN projects p ON m.project_id = p.id
           WHERE m.id = $1
             AND (p.client_id = $2 OR p.expert_id = $2 OR p.company_id = $2)
           LIMIT 1`,
          [milestoneId, userId]
        );
        hasAccess = r.rows.length > 0;
      } else {
        hasAccess = false;
      }
    } else if (req.baseUrl === '/uploads/evidence') {
      const r = await pool.query(
        `SELECT 1 FROM milestone_disputes md
         JOIN milestones m ON md.milestone_id = m.id
         JOIN projects p ON m.project_id = p.id
         WHERE md.evidence_files::text LIKE $1
           AND (p.client_id = $2 OR p.expert_id = $2 OR p.company_id = $2 OR md.raised_by = $2)
         LIMIT 1`,
        [`%${fullPath}%`, userId]
      );
      hasAccess = r.rows.length > 0;
    } else if (req.baseUrl === '/uploads/chat') {
      const r = await pool.query(
        `SELECT 1 FROM messages msg
         JOIN projects p ON msg.project_id = p.id
         WHERE msg.content LIKE $1
           AND (p.client_id = $2 OR p.expert_id = $2 OR p.company_id = $2 OR msg.sender_id = $2 OR msg.recipient_id = $2)
         LIMIT 1`,
        [`%${fullPath}%`, userId]
      );
      hasAccess = r.rows.length > 0;
    } else if (req.baseUrl === '/uploads/user-contracts') {
      // User registration contracts — only own
      const r = await pool.query(
        `SELECT 1 FROM user_contracts WHERE contract_pdf_url LIKE $1 AND user_id = $2 LIMIT 1`,
        [`%${fullPath}`, userId]
      );
      hasAccess = r.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).send('Access denied to this file.');
    }
    next();
  } catch (err) {
    console.warn('[protectUploads] DB error:', err.message);
    return res.status(500).send('Server error checking file access.');
  }
};

// Mint a short-lived download token (5 min, audience='upload'). Used by frontend
// to build URLs with ?token=... without leaking the long-lived session JWT.
const downloadTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  message: { error: 'Prea multe cereri de download token.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const t = jwtLib.verify(auth.slice(7), process.env.JWT_SECRET);
        return `user-${t.id}`;
      } catch { /* fall through */ }
    }
    return req.ip;
  },
});
app.get('/api/auth/download-token', downloadTokenLimiter, (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth required' });
  try {
    const session = jwtLib.verify(auth.slice(7), process.env.JWT_SECRET);
    const token = jwtLib.sign(
      { id: session.id, email: session.email, role: session.role, aud: 'upload' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    res.json({ token, expires_in_seconds: 5 * 60 });
  } catch {
    return res.status(401).json({ error: 'Invalid session token' });
  }
});
app.use('/uploads/deliverables', protectUploads, express.static('uploads/deliverables'));
app.use('/uploads/chat', protectUploads, express.static('uploads/chat'));
app.use('/uploads/contracts', protectUploads, express.static('uploads/contracts'));
app.use('/uploads/invoices', protectUploads, express.static('uploads/invoices'));
app.use('/uploads/evidence', protectUploads, express.static('uploads/evidence'));
app.use('/uploads/user-contracts', protectUploads, express.static('uploads/user-contracts'));

// Health check — bypass apiLimiter so monitoring stays unrestricted
const SERVER_START = Date.now();
app.get('/api/health', async (req, res) => {
  const checks = { db: false, uptime_seconds: Math.floor((Date.now() - SERVER_START) / 1000) };
  try {
    await pool.query('SELECT 1');
    checks.db = true;
  } catch (err) {
    return res.status(503).json({ status: 'unhealthy', ...checks, error: 'db_unreachable' });
  }
  res.json({ status: 'ok', ...checks, timestamp: new Date().toISOString() });
});

// Routes — specific rate-limits before generic ones
app.post('/api/auth/forgot-password', forgotPasswordLimiter); // applies before authRoutes mounts
app.post('/api/wallet/payout', payoutLimiter); // before walletRoutes mounts
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);

// T&C versioning — public + protected + admin
app.get('/api/terms/current', termsController.getCurrentTerms);
app.get('/api/terms/check', protect, termsController.checkUserTerms);
app.post('/api/terms/accept', protect, termsController.acceptCurrentTerms);
app.get('/api/admin/terms', protect, adminOnly, termsController.listTermsVersions);
app.get('/api/admin/terms/:id', protect, adminOnly, termsController.getTermsVersion);
app.post('/api/admin/terms', protect, adminOnly, termsPublishLimiter, termsController.publishTermsVersion);

app.use('/api/users', usersRoutes);
app.use('/api/verification-calls', verificationRoutes);
// Marketplace apply flow — prestator applies to an open project, admin approves/rejects
app.post('/api/projects/:project_id/apply', protect, projectController.applyToProject);
app.get('/api/admin/task-requests/pending', protect, adminOnly, adminController.getPendingTaskRequests);
app.put('/api/admin/task-requests/:request_id/approve', protect, adminOnly, adminController.approveTaskRequest);
app.put('/api/admin/task-requests/:request_id/reject', protect, adminOnly, adminController.rejectTaskRequest);
app.use('/api/experts/posted-tasks', expertPostedTaskRoutes);
app.use('/api/companies/posted-tasks', clientPostedTaskRoutes);
app.use('/api/trust-profiles', trustProfileRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

// Public platform stats (no auth required)
app.get('/api/stats/platform', async (req, res) => {
  try {
    const [expertsRes, volumeRes, projectsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE kyc_status = 'verified' AND role IN ('expert','company')`),
      pool.query(`SELECT COALESCE(SUM(released_to_expert_total_ron + claudiu_earned_total_ron), 0) AS total FROM escrow_accounts`),
      pool.query(`SELECT COUNT(*) FROM projects WHERE status IN ('completed','finished','closed')`),
    ]);
    res.json({
      verified_experts: parseInt(expertsRes.rows[0].count),
      volume_ron: parseFloat(volumeRes.rows[0].total),
      completed_projects: parseInt(projectsRes.rows[0].count),
    });
  } catch {
    res.json({ verified_experts: 0, volume_ron: 0, completed_projects: 0 });
  }
});

// Search
app.get('/api/search', protect, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ results: [] });
    const like = `%${q}%`;
    const [usersRes, projectsRes] = await Promise.all([
      pool.query(
        `SELECT id, name, role, expertise, industry, bio, profile_image_url, kyc_status
         FROM users
         WHERE (name ILIKE $1 OR expertise ILIKE $1 OR industry ILIKE $1 OR bio ILIKE $1 OR company ILIKE $1)
           AND role IN ('expert','company')
           AND deleted_at IS NULL
         LIMIT 6`,
        [like]
      ),
      pool.query(
        `SELECT p.id, p.title, p.status, p.budget_ron, u.name as client_name
         FROM projects p
         LEFT JOIN users u ON p.client_id = u.id
         WHERE (p.title ILIKE $1 OR p.description ILIKE $1)
           AND p.deleted_at IS NULL
           AND (p.client_id = $2 OR p.expert_id = $2 OR p.company_id = $2 OR $3 = 'admin')
         LIMIT 4`,
        [like, req.user.id, req.user.role]
      ),
    ]);
    const results = [
      ...usersRes.rows.map(r => ({ type: 'user', ...r })),
      ...projectsRes.rows.map(r => ({ type: 'project', ...r })),
    ];
    res.json({ results });
  } catch (err) {
    res.status(500).json({ results: [] });
  }
});

// Projects
app.post('/api/projects', protect, projectController.createProject);
app.put('/api/projects/:projectId/assign', protect, projectController.assignUserToProject);
app.get('/api/projects', protect, projectController.getProjects);
app.get('/api/activity', protect, projectController.getRecentActivity);
app.get('/api/projects/:id', protect, projectController.getProjectDetail);
app.post('/api/projects/:projectId/milestones', protect, projectController.addMilestones);
app.post('/api/projects/:id/cancel', protect, projectController.cancelProject);
app.post('/api/projects/:id/expert-accept', protect, projectController.expertAcceptAssignment);
app.post('/api/projects/:id/expert-reject', protect, projectController.expertRejectAssignment);
app.get('/api/projects/:project_id/history', protect, adminController.getProjectHistory);
app.post('/api/admin/users/bulk-action', protect, adminOnly, adminController.bulkUserAction);

// Milestones
app.get('/api/disputes', protect, milestoneController.getMyDisputes);
app.post('/api/disputes/:dispute_id/evidence', protect, evidenceUpload.single('file'), async (req, res, next) => {
  try {
    const { dispute_id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const userId = req.user.id;
    const disp = await pool.query(
      `SELECT md.*, m.project_id FROM milestone_disputes md JOIN milestones m ON md.milestone_id = m.id WHERE md.id = $1`,
      [dispute_id]
    );
    if (!disp.rows.length) return res.status(404).json({ error: 'Dispute not found' });
    const d = disp.rows[0];
    const proj = await pool.query('SELECT client_id, expert_id, company_id FROM projects WHERE id = $1', [d.project_id]);
    const p = proj.rows[0] || {};
    const isParty = [p.client_id, p.expert_id, p.company_id].map(String).includes(String(userId));
    if (!isParty) return res.status(403).json({ error: 'Access denied' });
    const fileUrl = `/uploads/evidence/${req.file.filename}`;
    const existing = d.evidence_files || [];
    const newEntry = { url: fileUrl, name: req.file.originalname, uploaded_by: userId, uploaded_at: new Date().toISOString() };
    await pool.query(
      `UPDATE milestone_disputes SET evidence_files = $1 WHERE id = $2`,
      [JSON.stringify([...existing, newEntry]), dispute_id]
    );
    res.json({ success: true, file: newEntry });
  } catch (err) { next(err); }
});
app.post('/api/milestones/:milestone_id/deliverable', protect, upload.single('file'), milestoneController.uploadDeliverable);
app.put('/api/milestones/:milestone_id/start', protect, milestoneController.startMilestone);
app.put('/api/milestones/:milestone_id/approve', protect, milestoneController.approveMilestone);
app.put('/api/milestones/:milestone_id/request-revision', protect, milestoneController.requestRevision);
app.post('/api/milestones/:milestone_id/dispute', protect, milestoneController.disputeMilestone);

// Escrow
app.post('/api/escrow', protect, moneyLimiter, escrowController.createEscrowAccount);
app.post('/api/escrow/checkout', protect, moneyLimiter, escrowController.startCheckoutSession);
app.post('/api/escrow/payment-intent', protect, moneyLimiter, escrowController.createPaymentIntent);
app.post('/api/escrow/confirm-payment', protect, moneyLimiter, escrowController.confirmPayment);
app.get('/api/escrow/project/:project_id', protect, escrowController.getEscrowByProject);
app.get('/api/escrow/:escrow_id', protect, escrowController.getEscrowStatus);
app.post('/api/escrow/project/:project_id/topup', protect, moneyLimiter, escrowController.topupEscrow);
app.post('/api/escrow/project/:project_id/refund', protect, moneyLimiter, escrowController.refundEscrow);

// Messages
app.get('/api/messages/conversations', protect, messageController.getConversations);
app.post('/api/messages', protect, messageLimiter, messageController.sendMessage);
app.post('/api/messages/upload', protect, chatUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ success: true, fileUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
app.get('/api/projects/:project_id/messages', protect, messageController.getProjectMessages);
app.put('/api/messages/:message_id/read', protect, messageController.markAsRead);

// Contracts
app.post('/api/contracts/project', protect, contractController.createProjectContract);
app.post('/api/contracts/milestone', protect, contractController.createMilestoneContract);
app.post('/api/contracts/milestones/all', protect, contractController.createAllMilestoneContracts);
app.post('/api/contracts/final', protect, contractController.createFinalContract);
app.put('/api/contracts/:contract_id/accept', protect, contractController.acceptContract);
// Note: legacy routes sign-start/deliver/approve removed — milestone flow now goes through /api/milestones/:id/{deliverable,approve}
app.get('/api/projects/:project_id/contracts', protect, contractController.getProjectContracts);
app.get('/api/contracts/mine', protect, contractController.getUserContracts);
app.get('/api/contracts/:contract_id', protect, contractController.getContract);
app.post('/api/contracts/:contract_id/regenerate-pdf', protect, pdfRegenLimiter, contractController.regenerateContractPdf);
app.get('/api/contracts/:project_id/generate', protect, contractController.generateContract);
app.get('/api/contracts/:project_id/proces-verbal', protect, contractController.generateProcesVerbal);
app.get('/api/projects/:project_id/workflow', protect, contractController.getContractWorkflowStatus);
app.post('/api/projects/:project_id/complete', protect, contractController.completeProject);
app.post('/api/contracts/project/:project_id/backfill', protect, contractController.backfillProjectContracts);
app.post('/api/contracts/milestone/:milestone_id/prepare-delivery', protect, contractController.prepareDelivery);
app.post('/api/contracts/task/:taskId/prepare-finalize', protect, contractController.preparePmFinalize);
app.get('/api/milestones/:milestone_id/history', protect, milestoneController.getDeliverableHistory);
app.post('/api/admin/milestones/:milestone_id/release', protect, adminOnly, milestoneController.adminReleaseMilestoneFunds);

// Invoice download
app.get('/api/milestones/:milestone_id/invoice', protect, async (req, res) => {
  try {
    const { milestone_id } = req.params;
    const { generateInvoicePDF } = await import('./services/contractPDF.js');

    const msRes = await pool.query(
      `SELECT m.*, p.title as project_title, p.client_id, p.expert_id, p.company_id
       FROM milestones m
       JOIN projects p ON m.project_id = p.id
       WHERE m.id = $1`,
      [milestone_id]
    );
    if (msRes.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });

    const ms = msRes.rows[0];
    const userId = req.user.id;
    if (![ms.client_id, ms.expert_id, ms.company_id].includes(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (ms.status !== 'approved' && ms.status !== 'released') {
      return res.status(400).json({ error: 'Invoice available only for approved milestones' });
    }

    const partyIds = [ms.client_id, ms.expert_id || ms.company_id].filter(Boolean);
    const usersRes = await pool.query(`SELECT id, name, email, phone, company FROM users WHERE id = ANY($1)`, [partyIds]);
    const usersMap = Object.fromEntries(usersRes.rows.map(u => [u.id, u]));

    const client = usersMap[ms.client_id] || { name: 'N/A' };
    const expert = usersMap[ms.expert_id || ms.company_id] || { name: 'N/A' };
    const invoiceNumber = `INV-${ms.id.substring(0, 8).toUpperCase()}`;
    const milestone = {
      ...ms,
      title: ms.title,
      amount: ms.amount,
      commission_rate: ms.commission_rate || 10,
      released_at: ms.updated_at,
      delivered_at: ms.delivered_at,
      approved_at: ms.approved_at,
    };
    const project = { title: ms.project_title };

    const pdfUrl = await generateInvoicePDF({ milestone, project, client, expert, invoiceNumber });
    res.json({ success: true, invoice_url: pdfUrl, invoice_number: invoiceNumber });
  } catch (err) {
    console.error('Error generating invoice:', err);
    res.status(500).json({ error: 'Failed to generate invoice', details: err.message });
  }
});

// Modifications
app.post('/api/modifications/project', protect, modificationController.proposeProjectModification);
app.post('/api/modifications/milestone', protect, modificationController.proposeMilestoneModification);
app.post('/api/modifications/milestone/create', protect, modificationController.proposeMilestoneCreate);
app.post('/api/modifications/milestone/delete', protect, modificationController.proposeMilestoneDelete);
app.put('/api/modifications/:modification_id/approve', protect, modificationController.approveModification);
app.put('/api/modifications/:modification_id/reject', protect, modificationController.rejectModification);
app.get('/api/projects/:project_id/modifications', protect, modificationController.getProjectModifications);

// Admin
app.put('/api/admin/experts/:id/verify', protect, adminOnly, adminController.verifyExpert);
app.get('/api/admin/experts/pending', protect, adminOnly, adminController.getPendingExperts);
app.get('/api/admin/experts/verified', protect, adminOnly, adminController.getVerifiedExperts);
app.post('/api/admin/projects/:project_id/assign-expert', protect, adminOnly, adminController.assignExpertToProject);
app.put('/api/admin/disputes/:dispute_id/resolve', protect, adminOnly, adminController.resolveAdminDispute);
app.get('/api/admin/dashboard', protect, adminOnly, adminController.getAdminDashboard);
// /api/admin/fix-milestones removed — was a dev-only one-shot data-mutating script with hardcoded values

// Admin - Users Management
app.get('/api/admin/users', protect, adminOnly, adminController.getAllUsers);
app.get('/api/admin/users/pending', protect, adminOnly, adminController.getPendingUsers);
app.get('/api/admin/companies/verified', protect, adminOnly, adminController.getVerifiedCompanies);
app.post('/api/admin/users/:user_id/approve', protect, adminOnly, adminController.approveUser);
app.post('/api/admin/users/:user_id/reject', protect, adminOnly, adminController.rejectUser);
app.delete('/api/admin/users/:user_id', protect, adminOnly, adminController.deleteUser);
app.post('/api/admin/users/:user_id/restore', protect, adminOnly, adminController.restoreUser);

// Admin - Projects Management
app.get('/api/admin/projects', protect, adminOnly, adminController.getAllProjects);
app.get('/api/admin/projects/pending-approval', protect, adminOnly, adminController.getPendingApprovalProjects);
app.post('/api/admin/projects/:project_id/approve', protect, adminOnly, adminController.approveProject);
app.post('/api/admin/projects/:project_id/reject', protect, adminOnly, adminController.rejectProject);
app.delete('/api/admin/projects/:project_id', protect, adminOnly, adminController.deleteProject);
app.put('/api/admin/projects/:project_id/assign-expert', protect, adminOnly, adminController.assignExpertToProject);
app.put('/api/admin/projects/:project_id/remove-expert', protect, adminOnly, adminController.removeExpertFromProject);

// Admin - Task Requests Management
// /api/admin/task-requests/* removed — bid flow not part of platform

// Admin - Expert Posted Tasks Management
app.get('/api/admin/expert-posted-tasks/pending', protect, adminOnly, adminController.getPendingExpertPostedTasks);
app.post('/api/admin/expert-posted-tasks/:project_id/approve', protect, adminOnly, adminController.approveExpertPostedTask);
app.post('/api/admin/expert-posted-tasks/:project_id/reject', protect, adminOnly, adminController.rejectExpertPostedTask);

// Admin - Client Posted Tasks Management
app.get('/api/admin/client-posted-tasks/pending', protect, adminOnly, adminController.getPendingClientPostedTasks);
app.post('/api/admin/client-posted-tasks/:project_id/approve', protect, adminOnly, adminController.approveClientPostedTask);
app.post('/api/admin/client-posted-tasks/:project_id/reject', protect, adminOnly, adminController.rejectClientPostedTask);
app.post('/api/admin/client-posted-tasks/:project_id/assign-company', protect, adminOnly, adminController.assignCompanyToClientTask);

// Admin — Admin Edit Project
app.post('/api/admin/projects/:project_id/admin-edit', protect, adminOnly, adminController.adminEditProject);

// User accept/reject admin edit
app.post('/api/projects/:project_id/accept-admin-edit', protect, projectController.acceptAdminEdit);
app.post('/api/projects/:project_id/reject-admin-edit', protect, projectController.rejectAdminEdit);

// Admin — Financiar, Contracte, Dispute, Activity
app.get('/api/admin/financiar', protect, adminOnly, adminController.getAdminFinanciar);
app.get('/api/admin/contracts', protect, adminOnly, adminController.getAdminContracts);
app.get('/api/admin/disputes', protect, adminOnly, adminController.getAdminDisputes);
// duplicate route removed — resolveMilestoneDispute at line 257 handles this path
app.get('/api/admin/activity', protect, adminOnly, adminController.getAdminActivity);

// Admin audit log
app.get('/api/admin/audit-log', protect, adminOnly, async (req, res, next) => {
  try {
    const { getAdminAuditLog } = await import('./services/adminAuditService.js');
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const rows = await getAdminAuditLog({
      adminId: req.query.admin_id || null,
      targetType: req.query.target_type || null,
      targetId: req.query.target_id || null,
      limit,
      offset: (page - 1) * limit,
    });
    res.json({ success: true, audit_log: rows, page, limit });
  } catch (err) { next(err); }
});

// Admin — CSV exports
app.get('/api/admin/export/financial', protect, adminOnly, exportFinancialCsv);
app.get('/api/admin/export/users', protect, adminOnly, exportUsersCsv);
app.get('/api/admin/export/disputes', protect, adminOnly, exportDisputesCsv);

// Project Management - Tasks
app.post('/api/tasks', protect, projectManagementController.createTask);
app.get('/api/tasks', protect, projectManagementController.getTasks);
app.get('/api/tasks/:taskId', protect, projectManagementController.getTaskDetail);
app.put('/api/tasks/:taskId', protect, projectManagementController.updateTask);
app.delete('/api/tasks/:taskId', protect, projectManagementController.deleteTask);
// PM task finalization — client requests, admin approves
app.post('/api/tasks/:taskId/request-finalization', protect, projectManagementController.requestPmFinalization);
app.post('/api/tasks/:taskId/approve-finalization', protect, adminOnly, projectManagementController.approvePmFinalization);

// Project Management - Assignments
app.post('/api/tasks/:taskId/assignments', protect, projectManagementController.createAssignment);
app.put('/api/tasks/:taskId/assignments/:assignmentId/assign', protect, projectManagementController.assignUserToAssignment);
app.get('/api/tasks/:taskId/assignments/:assignmentId', protect, projectManagementController.getAssignmentDetail);
app.put('/api/tasks/:taskId/assignments/:assignmentId/client-approve', protect, projectManagementController.clientApproveAssignment);
app.put('/api/tasks/:taskId/assignments/:assignmentId/client-reject', protect, projectManagementController.clientRejectAssignment);
app.put('/api/tasks/:taskId/assignments/:assignmentId/expert-accept', protect, projectManagementController.expertAcceptAssignment);
app.put('/api/tasks/:taskId/assignments/:assignmentId/expert-reject', protect, projectManagementController.expertRejectAssignment);

// Admin - assign expert + company to project (combined endpoint)
app.put('/api/admin/projects/:project_id/assign', protect, adminOnly, adminController.assignToProject);
// Admin - create task on behalf of client (requires client approval)
app.post('/api/admin/tasks/:task_id/create-assignment', protect, adminOnly, adminController.createTaskForClient);

// PDF Presentation endpoint
app.get('/api/docs/trust-system', async (req, res) => {
  try {
    const { generateTrustSystemPresentationBuffer } = await import('./services/pdfGenerator.js');
    const pdfBuffer = await generateTrustSystemPresentationBuffer();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=trust-system-presentation.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

// Error handling
// Wallet & Stripe Connect routes
app.use('/api/wallet', walletRoutes);
app.use('/api/stripe', stripeRoutes);

// Admin financial management routes
app.get('/api/admin/financiar/report', protect, adminOnly, adminController.getAdminFinancialReport);
app.get('/api/admin/payouts', protect, adminOnly, adminController.getAdminPayoutRequests);
app.put('/api/admin/payouts/:id/approve', protect, adminOnly, adminController.approvePayoutRequest);
app.put('/api/admin/payouts/:id/reject', protect, adminOnly, adminController.rejectPayoutRequest);
app.put('/api/admin/payouts/:id/mark-paid', protect, adminOnly, adminController.markPayoutAsPaid);

app.use(errorHandler);

// Arbitrary lock key for dispute auto-archival. Same number across all instances
// so only one instance does the work at a time (pg_try_advisory_lock is per-connection,
// but we hold one dedicated connection for the entire run).
const DISPUTE_TIMEOUT_LOCK_KEY = 4271337;

async function autoArchiveStaleDisputes() {
  const lockClient = await pool.connect();
  try {
    // Try to acquire cluster-wide advisory lock; skip silently if another instance holds it
    const lockRes = await lockClient.query(
      `SELECT pg_try_advisory_lock($1) AS acquired`,
      [DISPUTE_TIMEOUT_LOCK_KEY]
    );
    if (!lockRes.rows[0]?.acquired) {
      logger.debug('[dispute-timeout] another instance is running, skipping');
      return;
    }

    const TIMEOUT_DAYS = 30;
    const result = await lockClient.query(
      `UPDATE milestone_disputes
       SET status = 'resolved',
           claudiu_decision = 'Disputa a fost arhivată automat după ${TIMEOUT_DAYS} de zile fără rezoluție. Fondurile rămase în escrow au fost returnate clientului.',
           decision_type = 'refund',
           resolved_at = NOW()
       WHERE status IN ('pending', 'open')
         AND created_at < NOW() - INTERVAL '${TIMEOUT_DAYS} days'
       RETURNING id, milestone_id, raised_by`
    );
    if (result.rows.length === 0) {
      await lockClient.query(`SELECT pg_advisory_unlock($1)`, [DISPUTE_TIMEOUT_LOCK_KEY]).catch(() => {});
      return;
    }

    logger.info({ count: result.rows.length }, '[dispute-timeout] Auto-archived stale disputes');

    for (const d of result.rows) {
      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');

        const msRes = await dbClient.query(
          `SELECT m.project_id, m.amount_ron, p.client_id, p.expert_id, p.company_id, p.title as project_title
           FROM milestones m JOIN projects p ON m.project_id = p.id WHERE m.id = $1`,
          [d.milestone_id]
        );
        if (!msRes.rows.length) { await dbClient.query('ROLLBACK'); continue; }
        const { project_id, client_id, expert_id, company_id, project_title } = msRes.rows[0];

        // Refund the milestone's held amount from escrow → client wallet
        const escrowRes = await dbClient.query(
          `SELECT id, held_balance_ron FROM escrow_accounts WHERE project_id = $1 FOR UPDATE`,
          [project_id]
        );
        const escrow = escrowRes.rows[0];
        let refundAmount = 0;
        if (escrow) {
          const milestoneAmt = parseFloat(msRes.rows[0].amount_ron) || 0;
          const held = parseFloat(escrow.held_balance_ron) || 0;
          refundAmount = Math.min(milestoneAmt, held);
          if (refundAmount > 0) {
            await dbClient.query(
              `UPDATE escrow_accounts SET held_balance_ron = held_balance_ron - $1 WHERE id = $2`,
              [refundAmount, escrow.id]
            );
            await dbClient.query(
              `INSERT INTO wallet_transactions (user_id, amount, type, description, project_id)
               VALUES ($1, $2, 'refund', $3, $4)`,
              [client_id, refundAmount, `Refund auto din disputa #${d.id} (${TIMEOUT_DAYS}+ zile fără rezoluție)`, project_id]
            );
          }
        }

        // Mark milestone as cancelled (not 'pending') after auto-refund — prevents re-approve/double-pay.
        await dbClient.query(
          `UPDATE milestones SET status = 'cancelled' WHERE id = $1 AND status = 'disputed'`,
          [d.milestone_id]
        );
        await dbClient.query(
          `UPDATE projects SET status = 'cancelled' WHERE id = $1 AND status = 'disputed'`,
          [project_id]
        );

        // Update dispute decision to reflect actual refund amount
        await dbClient.query(
          `UPDATE milestone_disputes SET claudiu_release_amount_ron = $1 WHERE id = $2`,
          [refundAmount, d.id]
        );

        await dbClient.query('COMMIT');

        // Notify all parties
        const notifyIds = [client_id, expert_id || company_id, d.raised_by].filter(Boolean);
        const uniqueIds = [...new Set(notifyIds.map(String))];
        for (const uid of uniqueIds) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link, created_at)
             VALUES ($1, 'dispute_archived', 'Dispută arhivată automat', $2, '/disputes', NOW())`,
            [uid, `Disputa pentru "${project_title}" a fost arhivată după ${TIMEOUT_DAYS}+ zile. ${refundAmount > 0 ? `${refundAmount} RON returnați clientului.` : ''}`]
          ).catch(e => logger.warn({ err: e }, '[dispute-timeout] notify failed'));
        }
      } catch (innerErr) {
        await dbClient.query('ROLLBACK').catch(() => {});
        logger.error({ err: innerErr, disputeId: d.id }, '[dispute-timeout] Inner error');
      } finally {
        dbClient.release();
      }
    }
  } catch (e) {
    logger.error({ err: e }, '[dispute-timeout] Error');
  } finally {
    try {
      await lockClient.query(`SELECT pg_advisory_unlock($1)`, [DISPUTE_TIMEOUT_LOCK_KEY]);
    } catch (e) {
      logger.warn({ err: e }, '[dispute-timeout] Failed to release advisory lock');
    }
    lockClient.release();
  }
}

const KYC_SYNC_LOCK_KEY = 4271338;

async function syncStripeKycStatuses() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.startsWith('sk_test_4eC39')) {
    logger.debug('[kyc-sync] Stripe not configured, skipping');
    return;
  }

  const lockClient = await pool.connect();
  try {
    const lockRes = await lockClient.query(
      `SELECT pg_try_advisory_lock($1) AS acquired`,
      [KYC_SYNC_LOCK_KEY]
    );
    if (!lockRes.rows[0]?.acquired) {
      logger.debug('[kyc-sync] another instance is running, skipping');
      return;
    }

    const usersRes = await lockClient.query(
      `SELECT id, stripe_account_id
       FROM users
       WHERE stripe_account_id LIKE 'acct_%'
         AND COALESCE(kyc_status, 'pending') != 'verified'
       LIMIT 100`
    );

    if (usersRes.rows.length === 0) {
      logger.debug('[kyc-sync] no users to check');
      return;
    }

    const { default: stripe } = await import('./config/stripe.js');
    let synced = 0;
    let verified = 0;

    for (const user of usersRes.rows) {
      try {
        const acct = await stripe.accounts.retrieve(user.stripe_account_id);
        const onboardingComplete = !!acct.details_submitted;
        const chargesEnabled = !!acct.charges_enabled;
        const transfersEnabled = !!acct.payouts_enabled && acct.capabilities?.transfers === 'active';
        const noOutstanding = !(acct.requirements?.currently_due?.length || 0)
          && !(acct.requirements?.past_due?.length || 0);
        const stripeKycVerified = onboardingComplete && chargesEnabled && noOutstanding;

        await lockClient.query(
          `UPDATE users SET
             stripe_onboarding_complete = $1,
             stripe_charges_enabled = $2,
             stripe_transfers_enabled = $3,
             kyc_status = CASE
               WHEN $5::boolean = TRUE AND COALESCE(kyc_status, 'pending') != 'verified' THEN 'verified'
               ELSE kyc_status
             END,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [onboardingComplete, chargesEnabled, transfersEnabled, user.id, stripeKycVerified]
        );

        if (stripeKycVerified) {
          verified++;
          await lockClient.query(
            `INSERT INTO notifications (user_id, type, title, message, link, created_at)
             SELECT $1, 'kyc_verified', 'KYC complet ✓',
                    'Verificarea Stripe a fost finalizată. Acum poți folosi toate funcționalitățile platformei.',
                    '/wallet', NOW()
             WHERE NOT EXISTS (
               SELECT 1 FROM notifications
               WHERE user_id = $1 AND type = 'kyc_verified'
                 AND created_at > NOW() - INTERVAL '7 days'
             )`,
            [user.id]
          ).catch(() => {});
        }

        synced++;
      } catch (err) {
        logger.warn({ userId: user.id, err: err.message }, '[kyc-sync] user sync failed');
      }
    }

    logger.info({ checked: usersRes.rows.length, synced, verified }, '[kyc-sync] completed');
  } catch (e) {
    logger.error({ err: e }, '[kyc-sync] Error');
  } finally {
    try {
      await lockClient.query(`SELECT pg_advisory_unlock($1)`, [KYC_SYNC_LOCK_KEY]);
    } catch (e) {
      logger.warn({ err: e }, '[kyc-sync] Failed to release advisory lock');
    }
    lockClient.release();
  }
}

const PORT = process.env.PORT || 5000;
runMigrations().then(() => {
  const server = createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    logger.info({ port: PORT }, 'ESCRO Platform Backend running');
  });

  // Run dispute auto-archival on startup and every 24 hours
  autoArchiveStaleDisputes();
  setInterval(autoArchiveStaleDisputes, 24 * 60 * 60 * 1000);

  // Sync Stripe KYC status for users whose webhook may have been missed (every 6h)
  syncStripeKycStatuses();
  setInterval(syncStripeKycStatuses, 6 * 60 * 60 * 1000);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

