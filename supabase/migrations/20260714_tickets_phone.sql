-- Add phone field to tickets table for display in scanner/admin views
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS phone text;
