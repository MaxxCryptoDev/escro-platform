import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const setupDb = async () => {
  // First connect to postgres db to create escro_platform db
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'Cascada123',
    database: 'postgres'
  });

  try {
    console.log('Checking if escro_platform database exists...');
    
    // Create database if not exists
    await adminPool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'escro_platform'
    `).then(async (result) => {
      if (result.rows.length === 0) {
        console.log('Creating escro_platform database...');
        await adminPool.query('CREATE DATABASE escro_platform');
        console.log('Database created successfully');
      } else {
        console.log('Database escro_platform already exists');
      }
    });

    await adminPool.end();

    // Now connect to escro_platform db
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: 'postgres',
      password: process.env.DB_PASSWORD || 'Cascada123',
      database: 'escro_platform'
    });

    console.log('Connected to escro_platform database');
    console.log('Creating tables...');

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
    console.log('✓ Users table created');

    // Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expert_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR NOT NULL,
        budget DECIMAL(12, 2) NOT NULL,
        status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
        deadline DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Projects table created');

    // Milestones table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        order_number INTEGER,
        title VARCHAR NOT NULL,
        description TEXT,
        deliverable_description TEXT,
        amount DECIMAL(12, 2),
        amount_ron DECIMAL(12, 2),
        percentage_of_budget DECIMAL(5, 2),
        due_date DATE,
        status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'delivered', 'approved', 'released', 'disputed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Milestones table created');

    // Escrow accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS escrow_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        total_amount DECIMAL(12, 2) NOT NULL,
        locked_amount DECIMAL(12, 2) DEFAULT 0,
        released_amount DECIMAL(12, 2) DEFAULT 0,
        stripe_account_id VARCHAR,
        status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'closed', 'disputed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Escrow accounts table created');

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        attachment_url VARCHAR,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Messages table created');

    // Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        escrow_id UUID NOT NULL REFERENCES escrow_accounts(id) ON DELETE CASCADE,
        milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        type VARCHAR NOT NULL CHECK (type IN ('lock', 'release', 'refund')),
        status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        stripe_transfer_id VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Transactions table created');

    // Disputes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        raised_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR NOT NULL,
        description TEXT NOT NULL,
        evidence_url VARCHAR,
        status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
        resolution TEXT,
        resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);
    console.log('✓ Disputes table created');

    // Ratings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Ratings table created');

    console.log('\n✓ Database initialization completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1);
  }
};

setupDb();
