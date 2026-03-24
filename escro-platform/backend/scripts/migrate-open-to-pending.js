import pg from 'pg';

const pool = new pg.Pool({
  user: 'postgres',
  password: 'Cascada123',
  host: 'localhost',
  database: 'escro_platform'
});

async function migrate() {
  try {
    console.log('Starting migration: changing "open" to "pending_assignment"...');
    
    // 1. Update existing projects with status 'open' to 'pending_assignment'
    const updateResult = await pool.query(`
      UPDATE projects 
      SET status = 'pending_assignment' 
      WHERE status = 'open'
    `);
    console.log(`✓ Updated ${updateResult.rowCount} projects from 'open' to 'pending_assignment'`);
    
    // 2. Update constraint on projects table
    console.log('Updating database constraint...');
    
    // First, drop old constraint
    await pool.query(`
      ALTER TABLE projects 
      DROP CONSTRAINT IF EXISTS projects_status_check
    `);
    
    // Add new constraint
    await pool.query(`
      ALTER TABLE projects 
      ADD CONSTRAINT projects_status_check 
      CHECK (status IN ('pending_assignment', 'approved', 'assigned', 'in_progress', 'delivered', 'completed', 'disputed'))
    `);
    console.log('✓ Database constraint updated');
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
