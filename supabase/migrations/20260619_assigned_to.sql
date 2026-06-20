-- Add assigned_to column to transactions (Club by default)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS assigned_to text DEFAULT 'Club';
