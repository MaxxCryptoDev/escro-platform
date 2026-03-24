import pool from '../config/database.js';

async function addMilestonesToBlaProject() {
  try {
    console.log('Adding milestones to "bla bla" project...');

    // Get the bla bla project
    const projectResult = await pool.query(
      "SELECT id, budget_ron FROM projects WHERE title = 'bla bla'"
    );

    if (projectResult.rows.length === 0) {
      console.error('Project "bla bla" not found');
      process.exit(1);
    }

    const projectId = projectResult.rows[0].id;
    const budget_ron = projectResult.rows[0].budget_ron;

    console.log('Project found:', { id: projectId, budget: budget_ron });

    // Add two milestones
    const milestones = [
      {
        title: 'Design & Planning',
        deliverable_description: 'Project design document and planning',
        percentage_of_budget: 25
      },
      {
        title: 'Development',
        deliverable_description: 'Core development and implementation',
        percentage_of_budget: 75
      }
    ];

    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      const amount = Math.round((budget_ron * milestone.percentage_of_budget) / 100 * 100) / 100;

      const result = await pool.query(
        `INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id`,
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

      console.log(`✓ Milestone ${i + 1} created:`, {
        title: milestone.title,
        amount: amount,
        percentage: milestone.percentage_of_budget
      });
    }

    console.log('✓ All milestones added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding milestones:', error);
    process.exit(1);
  }
}

addMilestonesToBlaProject();
