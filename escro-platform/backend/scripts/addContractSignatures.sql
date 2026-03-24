-- Add signature fields to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party1_signature TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party2_signature TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party1_signed_at TIMESTAMP;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party2_signed_at TIMESTAMP;
