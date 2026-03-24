import pool from '../config/database.js';
import trustProfileService from './trustProfileService.js';

export const initializeAllTrustProfiles = async () => {
  try {
    const usersResult = await pool.query(
      `SELECT id, role FROM users WHERE role IN ('expert', 'company')`
    );

    console.log(`Found ${usersResult.rows.length} users to process`);

    let created = 0;
    let updated = 0;

    for (const user of usersResult.rows) {
      try {
        const profile = await trustProfileService.getOrCreateTrustProfile(user.id);
        await trustProfileService.recalculateTrustProfile(user.id, null, 'batch_initialization');
        
        if (profile.trust_level === null) {
          created++;
        } else {
          updated++;
        }
        
        console.log(`Processed user ${user.id} (${user.role})`);
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error.message);
      }
    }

    console.log(`Trust profiles initialized: ${created} created, ${updated} updated`);
    return { created, updated, total: usersResult.rows.length };
  } catch (error) {
    console.error('Error initializing trust profiles:', error);
    throw error;
  }
};

export default { initializeAllTrustProfiles };
