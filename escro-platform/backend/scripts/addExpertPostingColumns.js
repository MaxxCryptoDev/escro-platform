import pool from '../config/database.js';

const addExpertPostingColumns = async () => {
  try {
    console.log('🔄 Adding expert posting columns to projects table...');

    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'posted_by_expert'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column posted_by_expert already exists');
      return;
    }

    // Add columns
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN posted_by_expert UUID REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN expert_posting_status VARCHAR DEFAULT 'pending' CHECK (expert_posting_status IN ('pending', 'approved', 'rejected')),
      ADD COLUMN expert_posting_message TEXT
    `);

    console.log('✓ Columns added successfully');

    // Add index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_posted_by_expert ON projects(posted_by_expert)
    `);

    console.log('✓ Index created successfully');
    console.log('✅ Migration completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

addExpertPostingColumns().then(() => {
  console.log('Done!');
  process.exit(0);
});
