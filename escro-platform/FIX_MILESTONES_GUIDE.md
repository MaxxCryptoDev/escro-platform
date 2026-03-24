# 🔧 How to Fix Milestones

## Automatic Method (Recommended)

1. Start the backend server:
   ```bash
   cd /home/maxx/Desktop/work/escro-platform/backend
   npm start
   ```

2. Start the frontend (in a new terminal):
   ```bash
   cd /home/maxx/Desktop/work/escro-platform/frontend
   npm run dev
   ```

3. Login to Admin Dashboard
   - Go to http://localhost:3000
   - Login as admin
   - Navigate to `/admin/dashboard`

4. Click the "🛠️ Tools" tab

5. Click "Fix Milestones" button

   This will:
   - ✓ Add missing columns to milestones table (order_number, deliverable_description, percentage_of_budget, amount_ron)
   - ✓ Create "bla bla" project if it doesn't exist
   - ✓ Add 2 milestones to the project:
     - "Design & Planning" (25% of budget = 1250 RON)
     - "Development & Implementation" (75% of budget = 3750 RON)

6. You should see a success message with the details

7. **Reload the frontend** to see the milestones appear in the dashboard

---

## Manual Method (If API doesn't work)

Run this SQL directly on your database:

```bash
psql -h localhost -U postgres -d escro_platform -f /home/maxx/Desktop/work/escro-platform/backend/scripts/fixMilestones.sql
```

Or use psql command line:

```sql
-- Add columns
ALTER TABLE milestones ADD COLUMN order_number INTEGER;
ALTER TABLE milestones ADD COLUMN deliverable_description TEXT;
ALTER TABLE milestones ADD COLUMN percentage_of_budget DECIMAL(5, 2);
ALTER TABLE milestones ADD COLUMN amount_ron DECIMAL(12, 2);

-- Add test data
INSERT INTO projects (title, description, budget_ron, timeline_days, status, created_at)
VALUES ('bla bla', 'Test project', 5000, 30, 'open', NOW())
RETURNING id;

-- Then insert milestones for the returned project ID
INSERT INTO milestones (project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
VALUES 
  ('{project-id}', 1, 'Design & Planning', 'Design & Planning', 'Project design document and planning deliverables', 25.00, 1250.00, 'pending', NOW()),
  ('{project-id}', 2, 'Development & Implementation', 'Development & Implementation', 'Core development and implementation deliverables', 75.00, 3750.00, 'pending', NOW());
```

---

## Files Modified/Created

**Backend:**
- `/backend/controllers/adminController.js` - Added `fixMilestonesSchema()` function
- `/backend/server.js` - Added POST `/api/admin/fix-milestones` route
- `/backend/scripts/fixMilestones.sql` - SQL script for manual execution
- `/backend/scripts/fix-milestones.js` - Node.js script for manual execution

**Frontend:**
- `/frontend/src/pages/AdminDashboard.jsx` - Added "🛠️ Tools" tab
- `/frontend/src/pages/AdminTools.jsx` - New component with fix button
- `/frontend/src/pages/AdminTools.css` - Styling

---

## What's Fixed

✅ **Schema Issues**: Database was missing 4 critical columns
✅ **Test Data**: "bla bla" project now has proper milestones
✅ **Frontend Ready**: Milestones will display correctly in dashboard

After running the fix, refresh the dashboard and you should see:
- "bla bla" project with 2 milestones
- Each milestone shows: title, percentage, amount in RON, and status
