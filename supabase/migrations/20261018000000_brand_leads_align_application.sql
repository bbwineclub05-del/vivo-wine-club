-- ── brand_leads: align to the Application convention ──────────────────────────
-- The first version of this table used its own statuses (new / in_review /
-- won / lost) and had no review columns. The reserved area reads every
-- application type through one registry, which expects
-- pending / accepted / rejected plus reviewed_by / reviewed_at, exactly as
-- ambassador_applications already does.
--
-- Safe to run: brand_leads is a new table with no rows yet, and nothing
-- else in the schema is touched. Everything is in one transaction, so a
-- failure leaves the table as it was.

BEGIN;

-- 1. Drop the old status CHECK, found by definition rather than by name.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.brand_leads'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.brand_leads DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- 2. Convert any row that might already exist, then set the new rules.
UPDATE public.brand_leads SET status = 'pending'  WHERE status IN ('new', 'in_review');
UPDATE public.brand_leads SET status = 'accepted' WHERE status = 'won';
UPDATE public.brand_leads SET status = 'rejected' WHERE status = 'lost';

ALTER TABLE public.brand_leads ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.brand_leads
  ADD CONSTRAINT brand_leads_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- 3. Who reviewed the enquiry and when. Written by the API when a lead is
--    accepted or rejected, cleared when it goes back to pending.
ALTER TABLE public.brand_leads ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE public.brand_leads ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMIT;
