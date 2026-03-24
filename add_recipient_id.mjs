import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  user: 'postgres',
  password: 'Cascada123',
  database: 'escro_platform',
  port: 5432,
});

async function run() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected successfully!\n');

    // Add the recipient_id column
    console.log('Adding recipient_id column to messages table...');
    const alterResult = await client.query(
      'ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id)'
    );
    console.log('Column added successfully!\n');

    // Get all columns from the messages table
    console.log('Fetching all columns from messages table...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);

    console.log('Columns in messages table:');
    console.log('========================\n');
    columnsResult.rows.forEach((row, index) => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - ${nullable}`);
    });

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConnection closed.');
  }
}

run();
