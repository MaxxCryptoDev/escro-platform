import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const alterDb = async () => {
  try {
    console.log('Altering projects table to add new status values...');

    // First, check if the column exists and what constraints it has
    const constraintCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'projects' AND constraint_type = 'CHECK'
    `);

    console.log('Found constraints:', constraintCheck.rows);

    // Drop the old constraint
    await pool.query(`
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS "projects_status_check" CASCADE
    `);

    console.log('✓ Dropped old constraint');

    // Add the new constraint with all status values
    await pool.query(`
      ALTER TABLE projects 
      ADD CONSTRAINT projects_status_check 
      CHECK (status IN ('pending_admin_approval', 'pending_assignment', 'assigned', 'open', 'in_progress', 'delivered', 'completed', 'disputed', 'rejected'))
    `);

    console.log('✓ Added new constraint with all status values');

    // Add the rejection_reason column if it doesn't exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'rejection_reason'
    `);

    if (columnCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE projects 
        ADD COLUMN rejection_reason TEXT
      `);
      console.log('✓ Added rejection_reason column');
    } else {
      console.log('✓ rejection_reason column already exists');
    }

    // Add updated_at column if it doesn't exist
    const updatedAtCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'updated_at'
    `);

    if (updatedAtCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE projects 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✓ Added updated_at column');
    } else {
      console.log('✓ updated_at column already exists');
    }

    console.log('Database altered successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database alteration error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

alterDb();
