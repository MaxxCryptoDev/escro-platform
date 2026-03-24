import pool from '../config/database.js';

async function ensureMilestoneColumns() {
  try {
    console.log('Checking milestones table schema...');

    // Check if columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'milestones'
    `);

    const columns = result.rows.map(r => r.column_name);
    console.log('Current columns:', columns);

    const requiredColumns = ['order_number', 'deliverable_description', 'percentage_of_budget', 'amount_ron'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    if (missingColumns.length > 0) {
      console.log('Adding missing columns:', missingColumns);

      for (const col of missingColumns) {
        if (col === 'order_number') {
          await pool.query('ALTER TABLE milestones ADD COLUMN order_number INTEGER');
        } else if (col === 'deliverable_description') {
          await pool.query('ALTER TABLE milestones ADD COLUMN deliverable_description TEXT');
        } else if (col === 'percentage_of_budget') {
          await pool.query('ALTER TABLE milestones ADD COLUMN percentage_of_budget DECIMAL(5, 2)');
        } else if (col === 'amount_ron') {
          await pool.query('ALTER TABLE milestones ADD COLUMN amount_ron DECIMAL(12, 2)');
        }
      }

      console.log('✓ Missing columns added');
    } else {
      console.log('✓ All required columns exist');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

ensureMilestoneColumns();
