-- Referral System Tables

-- Referral codes table (one per user)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- Referral tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'verified', 'completed', 'cancelled')),
  referrer_trust_bonus DECIMAL(5,2) DEFAULT 0,
  referred_trust_bonus DECIMAL(5,2) DEFAULT 0,
  referral_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_date TIMESTAMP,
  completed_date TIMESTAMP,

  CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Referral settings table (configurable bonuses)
CREATE TABLE IF NOT EXISTS referral_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) NOT NULL UNIQUE,
  value DECIMAL(10,2) NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default referral settings
INSERT INTO referral_settings (key, value, description) VALUES
  ('referrer_trust_bonus', 10.00, 'Trust score bonus for referrer when referral completes'),
  ('referred_trust_bonus', 15.00, 'Trust score bonus for new user when they verify'),
  ('referrer_collaboration_bonus', 5.00, 'Additional bonus per completed collaboration'),
  ('min_projects_for_completion', 1, 'Minimum projects to complete referral')
ON CONFLICT (key) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
