-- Fix milestones schema and add test data
-- Run with: psql -h localhost -U postgres -d escro_platform -f fixMilestones.sql

-- Step 1: Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'milestones' AND column_name = 'order_number') 
    THEN
        ALTER TABLE milestones ADD COLUMN order_number INTEGER;
        RAISE NOTICE 'Column order_number added';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'milestones' AND column_name = 'deliverable_description') 
    THEN
        ALTER TABLE milestones ADD COLUMN deliverable_description TEXT;
        RAISE NOTICE 'Column deliverable_description added';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'milestones' AND column_name = 'percentage_of_budget') 
    THEN
        ALTER TABLE milestones ADD COLUMN percentage_of_budget DECIMAL(5, 2);
        RAISE NOTICE 'Column percentage_of_budget added';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'milestones' AND column_name = 'amount_ron') 
    THEN
        ALTER TABLE milestones ADD COLUMN amount_ron DECIMAL(12, 2);
        RAISE NOTICE 'Column amount_ron added';
    END IF;
END $$;

-- Step 2: Find or create "bla bla" project
DO $$
DECLARE
    v_project_id UUID;
    v_budget DECIMAL;
BEGIN
    -- Check if project exists
    SELECT id, budget_ron INTO v_project_id, v_budget 
    FROM projects 
    WHERE title = 'bla bla' 
    LIMIT 1;

    -- If doesn't exist, create it
    IF v_project_id IS NULL THEN
        INSERT INTO projects (title, description, budget_ron, timeline_days, status, created_at)
        VALUES ('bla bla', 'Test project for milestones', 5000, 30, 'open', NOW())
        RETURNING id, budget_ron INTO v_project_id, v_budget;
        RAISE NOTICE 'Project "bla bla" created with ID: %', v_project_id;
    ELSE
        RAISE NOTICE 'Project "bla bla" found with ID: % and budget: % RON', v_project_id, v_budget;
    END IF;

    -- Delete existing milestones for this project
    DELETE FROM milestones WHERE project_id = v_project_id;
    RAISE NOTICE 'Cleared existing milestones';

    -- Insert milestone 1: Design & Planning (25%)
    INSERT INTO milestones (
        project_id, order_number, title, description, 
        deliverable_description, percentage_of_budget, amount_ron, 
        status, created_at
    ) VALUES (
        v_project_id, 1, 
        'Design & Planning', 
        'Design & Planning',
        'Project design document and planning deliverables',
        25.00,
        (v_budget * 0.25)::DECIMAL(12, 2),
        'pending',
        NOW()
    );
    RAISE NOTICE 'Added milestone 1: Design & Planning (25%%)';

    -- Insert milestone 2: Development & Implementation (75%)
    INSERT INTO milestones (
        project_id, order_number, title, description, 
        deliverable_description, percentage_of_budget, amount_ron, 
        status, created_at
    ) VALUES (
        v_project_id, 2, 
        'Development & Implementation', 
        'Development & Implementation',
        'Core development and implementation deliverables',
        75.00,
        (v_budget * 0.75)::DECIMAL(12, 2),
        'pending',
        NOW()
    );
    RAISE NOTICE 'Added milestone 2: Development & Implementation (75%%)';
    RAISE NOTICE '✅ All milestones fixed successfully!';
END $$;
