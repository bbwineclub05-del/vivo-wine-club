-- Add registration_closed flag to events for manual list/checkout closure
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_closed boolean NOT NULL DEFAULT false;
