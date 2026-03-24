import pool from '../config/database.js';

const addCompanyIdColumn = async () => {
  try {
    console.log('🔄 Adding company_id column to projects table...');

    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'company_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column company_id already exists');
      await pool.end();
      return;
    }

    // Add company_id column
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN company_id UUID REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log('✓ Column company_id added successfully');

    // Add index for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id)
    `);

    console.log('✓ Index created');
    await pool.end();
    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error adding company_id column:', error.message);
    await pool.end();
    process.exit(1);
  }
};

addCompanyIdColumn();
