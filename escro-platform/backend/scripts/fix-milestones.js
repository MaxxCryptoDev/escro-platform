import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'escro_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('Pool error:', err);
});

async function fixMilestones() {
  let client;
  try {
    console.log('🔧 Fixing milestones issue...\n');
    
    client = await pool.connect();
    console.log('✓ Connected to database');

    // Step 1: Check columns
    console.log('\nStep 1: Checking milestones table schema...');
    const colResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'milestones'
      ORDER BY ordinal_position
    `);

    const columns = colResult.rows.map(r => r.column_name);
    console.log('Current columns:', columns.join(', '));

    const requiredColumns = ['order_number', 'deliverable_description', 'percentage_of_budget', 'amount_ron'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\nAdding missing columns:', missingColumns.join(', '));

      if (!columns.includes('order_number')) {
        await client.query('ALTER TABLE milestones ADD COLUMN order_number INTEGER');
        console.log('✓ Added order_number');
      }
      if (!columns.includes('deliverable_description')) {
        await client.query('ALTER TABLE milestones ADD COLUMN deliverable_description TEXT');
        console.log('✓ Added deliverable_description');
      }
      if (!columns.includes('percentage_of_budget')) {
        await client.query('ALTER TABLE milestones ADD COLUMN percentage_of_budget DECIMAL(5, 2)');
        console.log('✓ Added percentage_of_budget');
      }
      if (!columns.includes('amount_ron')) {
        await client.query('ALTER TABLE milestones ADD COLUMN amount_ron DECIMAL(12, 2)');
        console.log('✓ Added amount_ron');
      }
    } else {
      console.log('✓ All required columns already exist');
    }

    // Step 2: Find or create "bla bla" project
    console.log('\nStep 2: Finding "bla bla" project...');
    let projectResult = await client.query(
      "SELECT id, budget_ron FROM projects WHERE title = 'bla bla'"
    );

    let projectId, budgetRon;

    if (projectResult.rows.length === 0) {
      console.log('Project "bla bla" not found, creating...');
      projectResult = await client.query(
        `INSERT INTO projects (title, description, budget_ron, timeline_days, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, budget_ron`,
        ['bla bla', 'Test project for milestones', 5000, 30, 'open']
      );
      console.log('✓ Created project "bla bla"');
    } else {
      console.log('✓ Found project "bla bla"');
    }

    projectId = projectResult.rows[0].id;
    budgetRon = projectResult.rows[0].budget_ron;
    console.log(`  ID: ${projectId}, Budget: ${budgetRon} RON`);

    // Step 3: Clear and add milestones
    console.log('\nStep 3: Adding milestones...');
    
    await client.query('DELETE FROM milestones WHERE project_id = $1', [projectId]);
    console.log('Cleared existing milestones');

    const milestone1 = await client.query(
      `INSERT INTO milestones (project_id, order_number, title, description, 
                               deliverable_description, percentage_of_budget, amount_ron, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, title, amount_ron`,
      [
        projectId, 1,
        'Design & Planning',
        'Design & Planning',
        'Project design document and planning deliverables',
        25,
        budgetRon * 0.25,
        'pending'
      ]
    );
    console.log(`✓ M1: ${milestone1.rows[0].title} (${milestone1.rows[0].amount_ron} RON)`);

    const milestone2 = await client.query(
      `INSERT INTO milestones (project_id, order_number, title, description, 
                               deliverable_description, percentage_of_budget, amount_ron, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, title, amount_ron`,
      [
        projectId, 2,
        'Development & Implementation',
        'Development & Implementation',
        'Core development and implementation deliverables',
        75,
        budgetRon * 0.75,
        'pending'
      ]
    );
    console.log(`✓ M2: ${milestone2.rows[0].title} (${milestone2.rows[0].amount_ron} RON)`);

    console.log('\n✅ All fixed! Reload dashboard to see milestones.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
}

fixMilestones();
