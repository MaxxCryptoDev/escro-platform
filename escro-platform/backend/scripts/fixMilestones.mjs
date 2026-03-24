import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'escro_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function fixMilestones() {
  try {
    console.log('🔧 Fixing milestones issue...\n');

    // Step 1: Check and add columns
    console.log('Step 1: Checking milestones table schema...');
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'milestones'
      ORDER BY ordinal_position
    `);

    const columns = result.rows.map(r => r.column_name);
    console.log('Current columns:', columns.join(', '));

    const requiredColumns = ['order_number', 'deliverable_description', 'percentage_of_budget', 'amount_ron'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\nAdding missing columns:', missingColumns.join(', '));

      if (!columns.includes('order_number')) {
        await pool.query('ALTER TABLE milestones ADD COLUMN order_number INTEGER');
        console.log('✓ Added order_number');
      }
      if (!columns.includes('deliverable_description')) {
        await pool.query('ALTER TABLE milestones ADD COLUMN deliverable_description TEXT');
        console.log('✓ Added deliverable_description');
      }
      if (!columns.includes('percentage_of_budget')) {
        await pool.query('ALTER TABLE milestones ADD COLUMN percentage_of_budget DECIMAL(5, 2)');
        console.log('✓ Added percentage_of_budget');
      }
      if (!columns.includes('amount_ron')) {
        await pool.query('ALTER TABLE milestones ADD COLUMN amount_ron DECIMAL(12, 2)');
        console.log('✓ Added amount_ron');
      }
    } else {
      console.log('✓ All required columns exist\n');
    }

    // Step 2: Get or create bla bla project
    console.log('\nStep 2: Checking "bla bla" project...');
    let projectResult = await pool.query(
      "SELECT id, budget_ron FROM projects WHERE title = 'bla bla'"
    );

    if (projectResult.rows.length === 0) {
      console.log('Project "bla bla" not found, creating it...');
      projectResult = await pool.query(
        `INSERT INTO projects (title, description, budget_ron, timeline_days, status) 
         VALUES ('bla bla', 'Test project', 5000, 30, 'open')
         RETURNING id, budget_ron`
      );
      console.log('✓ Project "bla bla" created with ID:', projectResult.rows[0].id);
    } else {
      console.log('✓ Project "bla bla" found with budget:', projectResult.rows[0].budget_ron, 'RON');
    }

    const projectId = projectResult.rows[0].id;
    const budget_ron = projectResult.rows[0].budget_ron;

    // Step 3: Add milestones
    console.log('\nStep 3: Adding milestones to "bla bla" project...');
    
    // Delete existing milestones for this project
    await pool.query('DELETE FROM milestones WHERE project_id = $1', [projectId]);
    console.log('Cleared existing milestones');

    const milestones = [
      {
        title: 'Design & Planning',
        deliverable_description: 'Project design document and planning deliverables',
        percentage_of_budget: 25
      },
      {
        title: 'Development & Implementation',
        deliverable_description: 'Core development and implementation deliverables',
        percentage_of_budget: 75
      }
    ];

    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      const amount = Math.round((budget_ron * milestone.percentage_of_budget) / 100 * 100) / 100;

      await pool.query(
        `INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          projectId,
          i + 1,
          milestone.title,
          milestone.title,
          milestone.deliverable_description,
          milestone.percentage_of_budget,
          amount,
          'pending'
        ]
      );

      console.log(`✓ Milestone ${i + 1}: "${milestone.title}" (${milestone.percentage_of_budget}% = ${amount} RON)`);
    }

    console.log('\n✅ All milestones fixed successfully!');
    console.log('\nNow reload the dashboard to see the milestones in the "bla bla" project.');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixMilestones();
