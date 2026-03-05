-- Add crop_path to faces table
ALTER TABLE faces ADD COLUMN IF NOT EXISTS crop_path TEXT;
