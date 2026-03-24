import pool from '../config/database.js';

async function addMilestoneColumns() {
  try {
    console.log('Adding missing columns to milestones table...');

    // Add columns to milestones table
    await pool.query(`
      ALTER TABLE milestones
      ADD COLUMN IF NOT EXISTS order_number INTEGER,
      ADD COLUMN IF NOT EXISTS deliverable_description TEXT,
      ADD COLUMN IF NOT EXISTS percentage_of_budget DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS amount_ron DECIMAL(12, 2)
    `);

    console.log('✓ Milestones table updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating milestones table:', error);
    process.exit(1);
  }
}

addMilestoneColumns();
