-- Stripe Connect Express infrastructure migration
-- Run: psql -U postgres -d escro_platform -f addStripeConnect.sql

-- Users: Stripe Connect account fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_transfers_enabled BOOLEAN DEFAULT FALSE;

-- Milestone releases: transfer tracking
ALTER TABLE milestone_releases ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR;
ALTER TABLE milestone_releases ADD COLUMN IF NOT EXISTS stripe_payout_status VARCHAR DEFAULT 'pending';
ALTER TABLE milestone_releases DROP CONSTRAINT IF EXISTS milestone_releases_stripe_payout_status_check;
ALTER TABLE milestone_releases ADD CONSTRAINT milestone_releases_stripe_payout_status_check
  CHECK (stripe_payout_status IN ('pending', 'processing', 'paid', 'failed'));

-- Payout requests table
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ron NUMERIC(10,2) NOT NULL,
  status VARCHAR DEFAULT 'pending',
  stripe_payout_id VARCHAR,
  admin_note TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  CONSTRAINT payout_requests_status_check CHECK (status IN ('pending','processing','paid','failed','cancelled'))
);

-- Stripe events audit log
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id VARCHAR UNIQUE,
  event_type VARCHAR,
  resource_id VARCHAR,
  data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Extend wallet_transactions: type constraint + milestone_release_id FK
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('referral_reward','withdrawal','adjustment','milestone_payment','payout','payout_request'));
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS milestone_release_id UUID REFERENCES milestone_releases(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id   ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status    ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON payout_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_milestone_release ON wallet_transactions(milestone_release_id);
