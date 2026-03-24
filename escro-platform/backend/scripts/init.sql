-- Create extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('expert', 'client', 'admin')),
  company VARCHAR,
  expertise TEXT,
  bio TEXT,
  phone VARCHAR,
  profile_image_url VARCHAR,
  portfolio_description TEXT,
  kyc_status VARCHAR DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  kyc_documents JSONB,
  verification_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expert_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  budget_ron DECIMAL(10, 2) NOT NULL,
  timeline_days INTEGER,
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'approved', 'assigned', 'in_progress', 'delivered', 'completed', 'disputed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deadline TIMESTAMP,
  completed_at TIMESTAMP,
  posted_by_expert UUID REFERENCES users(id) ON DELETE CASCADE,
  expert_posting_status VARCHAR DEFAULT 'pending' CHECK (expert_posting_status IN ('pending', 'approved', 'rejected')),
  expert_posting_message TEXT,
  posted_by_client UUID REFERENCES users(id) ON DELETE CASCADE,
  client_posting_status VARCHAR DEFAULT 'pending' CHECK (client_posting_status IN ('pending', 'approved', 'rejected')),
  client_posting_message TEXT
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  deliverable_description TEXT,
  percentage_of_budget DECIMAL(5, 2),
  amount_ron DECIMAL(10, 2),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'approved', 'disputed', 'released')),
  deliverable_file_url VARCHAR,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR NOT NULL,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification calls table
CREATE TABLE IF NOT EXISTS verification_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status VARCHAR DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task participation requests table
CREATE TABLE IF NOT EXISTS task_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_expert_id ON projects(expert_id);
CREATE INDEX IF NOT EXISTS idx_projects_posted_by_expert ON projects(posted_by_expert);
CREATE INDEX IF NOT EXISTS idx_projects_posted_by_client ON projects(posted_by_client);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_milestone_id ON payments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_verification_calls_user_id ON verification_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_task_requests_user_id ON task_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_task_requests_project_id ON task_requests(project_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
