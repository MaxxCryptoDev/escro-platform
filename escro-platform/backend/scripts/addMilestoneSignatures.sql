-- Add signature field to milestone_signatures table
ALTER TABLE milestone_signatures ADD COLUMN IF NOT EXISTS signature TEXT;
