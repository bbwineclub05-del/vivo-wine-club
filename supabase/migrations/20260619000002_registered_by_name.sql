-- Add registered_by_name column to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS registered_by_name text;
