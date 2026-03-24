-- Create a test client user
INSERT INTO users (id, name, email, password_hash, role, kyc_status, created_at, updated_at)
VALUES ('test-client-001', 'Test Client', 'testclient@example.com', 'hashed_pass', 'client', 'verified', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create a test project with pending_assignment status
INSERT INTO projects (id, client_id, title, description, budget_ron, timeline_days, status, created_at, deadline)
VALUES ('test-project-001', 'test-client-001', 'Test Project for Approval', 'This is a test project created for testing the approval workflow', 5000, 30, 'pending_assignment', NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- Create milestones for the test project
INSERT INTO milestones (id, project_id, order_number, title, description, deliverable_description, percentage_of_budget, amount_ron, status, created_at)
VALUES 
('test-milestone-001', 'test-project-001', 1, 'Design Phase', 'Design Phase', 'Mockups and designs', 30, 1500, 'pending', NOW()),
('test-milestone-002', 'test-project-001', 2, 'Development Phase', 'Development Phase', 'Code implementation', 50, 2500, 'pending', NOW()),
('test-milestone-003', 'test-project-001', 3, 'Testing & Deployment', 'Testing & Deployment', 'Testing and deployment', 20, 1000, 'pending', NOW())
ON CONFLICT (id) DO NOTHING;

SELECT 'Test data created' AS result;
