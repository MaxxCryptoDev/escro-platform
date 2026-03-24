#!/usr/bin/env node

import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env manually
const envPath = '/home/maxx/Desktop/work/escro-platform/backend/.env';
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && !key.startsWith('#')) {
    envVars[key.trim()] = rest.join('=').trim();
  }
});

const pool = new pg.Pool({
  user: envVars.DB_USER,
  password: envVars.DB_PASSWORD,
  host: envVars.DB_HOST,
  port: envVars.DB_PORT,
  database: envVars.DB_NAME
});

(async () => {
  try {
    console.log('Adding recipient_id column to messages table...');
    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id)
    `);
    console.log('✓ Column added/verified');
    
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in messages table:');
    result.rows.forEach(r => console.log('  -', r.column_name));
    
  } finally {
    await pool.end();
  }
})();
