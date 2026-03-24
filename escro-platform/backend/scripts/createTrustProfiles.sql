-- Trust Profiles Table
-- Unified trust level system for both Expert and Company entities

CREATE TABLE IF NOT EXISTS trust_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  profile_type VARCHAR NOT NULL CHECK (profile_type IN ('expert', 'company')),
  
  trust_level INTEGER CHECK (trust_level >= 1 AND trust_level <= 5),
  
  verified_identity BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  portfolio_completed BOOLEAN DEFAULT FALSE,
  accepted_master_contract BOOLEAN DEFAULT FALSE,
  
  recommended_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recommended_by_company_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  has_direct_collaboration BOOLEAN DEFAULT FALSE,
  is_known_directly_by_admin BOOLEAN DEFAULT FALSE,
  
  collaboration_count INTEGER DEFAULT 0,
  total_projects_completed INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews_count INTEGER DEFAULT 0,
  
  trust_score DECIMAL(5, 2) DEFAULT 0,
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_recommended_by_user FOREIGN KEY (recommended_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_recommended_by_company FOREIGN KEY (recommended_by_company_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_trust_profiles_user_id ON trust_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_profiles_profile_type ON trust_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_trust_profiles_trust_level ON trust_profiles(trust_level);

-- Master Contracts Table
CREATE TABLE IF NOT EXISTS master_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  contract_version VARCHAR NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_contracts_user_id ON master_contracts(user_id);

-- Direct Collaborations tracking
CREATE TABLE IF NOT EXISTS direct_collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  collaboration_type VARCHAR CHECK (collaboration_type IN ('expert_expert', 'expert_company', 'company_company')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_collaboration UNIQUE (user_id, collaborator_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_collaborations_user_id ON direct_collaborations(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_collaborations_collaborator_id ON direct_collaborations(collaborator_id);

-- Trust Profile History (for recalculation audit trail)
CREATE TABLE IF NOT EXISTS trust_profile_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trust_profile_id UUID NOT NULL REFERENCES trust_profiles(id) ON DELETE CASCADE,
  trust_level INTEGER,
  trust_score DECIMAL(5, 2),
  change_reason VARCHAR NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trust_profile_history_profile_id ON trust_profile_history(trust_profile_id);
CREATE INDEX IF NOT EXISTS idx_trust_profile_history_calculated_at ON trust_profile_history(calculated_at);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
