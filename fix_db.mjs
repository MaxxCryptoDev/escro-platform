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
    // Add the column if it doesn't exist
    console.log('Adding recipient_id column...');
    await pool.query(`
      ALTER TABLE IF EXISTS messages 
      ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id)
    `);
    
    // Get all columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    
    console.log('Messages table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n✓ Done');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
