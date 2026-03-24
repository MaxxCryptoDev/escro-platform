import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Cascada123',
  database: 'escro_platform'
});

async function fixConstraint() {
  try {
    console.log('Fixing projects_status_check constraint...');
    
    // Drop old constraint
    await pool.query('ALTER TABLE projects DROP CONSTRAINT projects_status_check');
    console.log('✓ Dropped old constraint');
    
    // Add new constraint with 'approved' status
    await pool.query(`
      ALTER TABLE projects ADD CONSTRAINT projects_status_check 
      CHECK (status IN ('open', 'approved', 'assigned', 'in_progress', 'delivered', 'completed', 'disputed'))
    `);
    console.log('✓ Added new constraint with approved status');
    
    await pool.end();
    console.log('✓ Done!');
  } catch (error) {
    console.error('Error fixing constraint:', error);
    process.exit(1);
  }
}

fixConstraint();
