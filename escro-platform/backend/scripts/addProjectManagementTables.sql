-- Migration: Create Project Management Module
-- This adds the Tasks table for managing multiple assignments

-- Create Tasks table (parent entity for Project Management)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  budget_ron DECIMAL(12, 2) NOT NULL,
  timeline_days INTEGER,
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deadline TIMESTAMP,
  completed_at TIMESTAMP
);

-- Add task_id column to projects table (for assignments)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Add assignment_type to distinguish between task_assignment and standalone project
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assignment_type VARCHAR DEFAULT 'standalone' CHECK (assignment_type IN ('standalone', 'task_assignment'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_projects_task_id ON projects(task_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Comments for documentation
COMMENT ON TABLE tasks IS 'Parent entity for Project Management module - contains multiple assignments (projects)';
COMMENT ON COLUMN tasks.client_id IS 'Beneficiary who created the task';
COMMENT ON COLUMN projects.task_id IS 'Links a project (assignment) to a parent task';
COMMENT ON COLUMN projects.assignment_type IS 'Distinguishes between standalone projects and task assignments';
