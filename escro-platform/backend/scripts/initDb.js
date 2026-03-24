import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const initDb = async () => {
  try {
    console.log('Initializing database...');

    // Create UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        role VARCHAR NOT NULL CHECK (role IN ('expert', 'client', 'admin')),
        company VARCHAR,
        expertise TEXT,
        bio TEXT,
        kyc_status VARCHAR DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
        kyc_documents JSONB,
        verification_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES users(id),
        expert_id UUID REFERENCES users(id),
        title VARCHAR NOT NULL,
        description TEXT,
        budget_ron NUMERIC(10, 2) NOT NULL,
        timeline_days INT,
        status VARCHAR DEFAULT 'pending_admin_approval' CHECK (status IN ('pending_admin_approval', 'pending_assignment', 'assigned', 'open', 'in_progress', 'delivered', 'completed', 'disputed', 'rejected')),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deadline TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Milestones table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id),
        order_number INT NOT NULL,
        title VARCHAR NOT NULL,
        description TEXT,
        deliverable_description TEXT,
        percentage_of_budget NUMERIC(5, 2),
        amount_ron NUMERIC(10, 2),
        status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'approved', 'disputed', 'released')),
        deliverable_file_url VARCHAR,
        completed_at TIMESTAMP,
        party1_approved BOOLEAN DEFAULT FALSE,
        party2_approved BOOLEAN DEFAULT FALSE,
        party1_approved_at TIMESTAMP,
        party2_approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Escrow accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS escrow_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id),
        total_amount_ron NUMERIC(10, 2),
        claudiu_commission_percent NUMERIC(5, 2) DEFAULT 10,
        status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'held', 'partially_released', 'fully_released')),
        held_balance_ron NUMERIC(10, 2) DEFAULT 0,
        released_to_expert_total_ron NUMERIC(10, 2) DEFAULT 0,
        claudiu_earned_total_ron NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        all_milestones_completed_at TIMESTAMP
      )
    `);

    // Milestone releases table (payment history)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestone_releases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        escrow_id UUID NOT NULL REFERENCES escrow_accounts(id),
        milestone_id UUID NOT NULL REFERENCES milestones(id),
        release_amount_ron NUMERIC(10, 2),
        claudiu_commission_amount_ron NUMERIC(10, 2),
        expert_amount_ron NUMERIC(10, 2),
        released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id),
        sender_id UUID NOT NULL REFERENCES users(id),
        recipient_id UUID REFERENCES users(id),
        content TEXT NOT NULL,
        file_url VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )
    `);

    // Contracts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id),
        milestone_id UUID REFERENCES milestones(id),
        contract_type VARCHAR NOT NULL CHECK (contract_type IN ('project', 'milestone', 'final')),
        party1_id UUID NOT NULL REFERENCES users(id),
        party2_id UUID NOT NULL REFERENCES users(id),
        terms TEXT NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
        party1_accepted BOOLEAN DEFAULT FALSE,
        party2_accepted BOOLEAN DEFAULT FALSE,
        party1_accepted_at TIMESTAMP,
        party2_accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Milestone disputes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestone_disputes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        milestone_id UUID NOT NULL REFERENCES milestones(id),
        raised_by UUID NOT NULL REFERENCES users(id),
        reason TEXT,
        claudiu_decision TEXT,
        claudiu_release_amount_ron NUMERIC(10, 2),
        status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_expert ON projects(expert_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_escrow_project ON escrow_accounts(project_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

initDb();
