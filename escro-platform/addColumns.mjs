import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  password: 'Cascada123',
  host: 'localhost',
  database: 'escro_platform'
});

async function run() {
  try {
    console.log('Adding missing columns to users table...');
    
    // Add industry column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS industry VARCHAR
    `);
    console.log('✓ industry column added');
    
    // Add experience column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS experience VARCHAR
    `);
    console.log('✓ experience column added');
    
    console.log('\n✓ All columns added successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
