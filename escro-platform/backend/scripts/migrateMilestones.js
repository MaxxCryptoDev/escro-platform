import pool from '../config/database.js';

async function migrateMilestones() {
  try {
    console.log('Starting milestones table migration...');

    // Add missing columns
    await pool.query(`
      ALTER TABLE milestones
      ADD COLUMN IF NOT EXISTS order_number INTEGER,
      ADD COLUMN IF NOT EXISTS deliverable_description TEXT,
      ADD COLUMN IF NOT EXISTS percentage_of_budget DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS amount_ron DECIMAL(12, 2)
    `);

    // Update status values to match new enum
    await pool.query(`
      ALTER TABLE milestones
      DROP CONSTRAINT IF EXISTS milestones_status_check
    `);

    await pool.query(`
      ALTER TABLE milestones
      ADD CONSTRAINT milestones_status_check 
      CHECK (status IN ('pending', 'in_progress', 'submitted', 'delivered', 'approved', 'released', 'disputed'))
    `);

    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    // Don't exit with error if columns already exist
    if (error.message.includes('already exists')) {
      console.log('✓ Columns already exist, skipping...');
      process.exit(0);
    }
    process.exit(1);
  }
}

migrateMilestones();
