-- ── ambassador_applications: three-state status + review tracking ──────────────
-- Aligns status to pending / accepted / rejected (used by /members → Application)
-- and adds who/when reviewed the application.
--
-- Order matters: the old CHECK does not allow 'pending', so it must be dropped
-- BEFORE converting rows. Everything runs in one transaction — if any step
-- fails, nothing is changed.
--
-- reviewed_by / reviewed_at are set by the API when status becomes accepted or
-- rejected, and cleared when it goes back to pending.

BEGIN;

-- 1. Drop the existing status CHECK (looked up by definition, not by name)
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.ambassador_applications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.ambassador_applications DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- 2. Convert existing rows
UPDATE public.ambassador_applications
SET status = 'pending', updated_at = now()
WHERE status IN ('new', 'in_review');

-- 3. New constraint + default
ALTER TABLE public.ambassador_applications
  ADD CONSTRAINT ambassador_applications_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected'));

ALTER TABLE public.ambassador_applications
  ALTER COLUMN status SET DEFAULT 'pending';

-- 4. Review tracking
ALTER TABLE public.ambassador_applications
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMIT;

-- Optional: remove the test row
-- DELETE FROM public.ambassador_applications WHERE email = '<test-email>';
