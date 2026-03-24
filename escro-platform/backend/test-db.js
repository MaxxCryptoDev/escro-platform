import pool from './config/database.js';

try {
  const result = await pool.query('SELECT 1');
  console.log('DB Connected successfully');
  process.exit(0);
} catch (e) {
  console.error('DB Connection failed:', e.message);
  process.exit(1);
}
