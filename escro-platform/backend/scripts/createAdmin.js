import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'escro_platform'
});

const createAdmin = async () => {
  const email = 'admin@escro.ro';
  const password = 'Cascada123?';
  const name = 'Admin';
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const checkResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkResult.rows.length > 0) {
      console.log('✅ Admin already exists');
      process.exit(0);
    }
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'admin']
    );
    
    console.log('✅ Admin created successfully:');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Name: ${result.rows[0].name}`);
    console.log(`   Role: ${result.rows[0].role}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
