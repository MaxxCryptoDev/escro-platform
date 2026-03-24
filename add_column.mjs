import pg from 'pg';

const pool = new pg.Pool({
  user: 'postgres',
  password: 'Cascada123',
  host: 'localhost',
  port: 5432,
  database: 'escro_platform'
});

pool.query(`
  ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id)
`).then(() => {
  console.log('Success');
  return pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' ORDER BY ordinal_position`);
}).then(res => {
  res.rows.forEach(r => console.log(r.column_name));
  pool.end();
}).catch(e => {
  console.error(e.message);
  pool.end();
});
