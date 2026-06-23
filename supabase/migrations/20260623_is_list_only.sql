-- Add is_list_only flag to events table
-- When true: no ticket checkout, shows guest registration form directly

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_list_only boolean NOT NULL DEFAULT false;
