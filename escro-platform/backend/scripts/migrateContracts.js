import pool from '../config/database.js';

const migrateContracts = async () => {
  try {
    // Add contract_type column to milestones if needed
    await pool.query(`
      ALTER TABLE milestones 
      ADD COLUMN IF NOT EXISTS party1_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS party2_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS party1_approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS party2_approved_at TIMESTAMP
    `);
    console.log('✅ Milestones columns added');

    // Create contracts table
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
    console.log('✅ Contracts table created');

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    process.exit();
  }
};

migrateContracts();
