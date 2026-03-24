-- Add pdf_url and contract_number to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date TIMESTAMP;
