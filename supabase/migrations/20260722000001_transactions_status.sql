-- Add status column to transactions for planning (forecast vs confirmed)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed'
  CHECK (status IN ('confirmed', 'forecast'));

-- Retroactively mark any future-dated rows as forecast
UPDATE public.transactions
SET status = 'forecast'
WHERE date > CURRENT_DATE AND status = 'confirmed';
