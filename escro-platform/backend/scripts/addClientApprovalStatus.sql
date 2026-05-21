-- Migration: Add pending_client_approval status and created_by_admin column to projects

-- 1. Add created_by_admin column (tracks if assignment was created by admin on behalf of client)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- 2. Update status constraint to include pending_client_approval
--    Drop existing constraint (may have different name depending on version)
DO $$
BEGIN
  -- Try to drop constraint by the most common names
  BEGIN ALTER TABLE projects DROP CONSTRAINT projects_status_check; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN ALTER TABLE projects DROP CONSTRAINT projects_status_check1; EXCEPTION WHEN undefined_object THEN NULL; END;
END$$;

-- Re-add with full set of valid statuses
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (
  status IN (
    'pending_admin_approval',
    'pending_client_approval',
    'pending_assignment',
    'assigned',
    'open',
    'in_progress',
    'delivered',
    'completed',
    'disputed',
    'rejected'
  )
);

-- 3. Also ensure tasks table has pending_admin_approval in its status constraint
DO $$
BEGIN
  BEGIN ALTER TABLE tasks DROP CONSTRAINT tasks_status_check; EXCEPTION WHEN undefined_object THEN NULL; END;
END$$;

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (
  status IN ('open', 'pending_admin_approval', 'in_progress', 'completed', 'cancelled')
);
