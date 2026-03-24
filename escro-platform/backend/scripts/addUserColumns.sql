-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS industry VARCHAR,
ADD COLUMN IF NOT EXISTS experience INTEGER;
