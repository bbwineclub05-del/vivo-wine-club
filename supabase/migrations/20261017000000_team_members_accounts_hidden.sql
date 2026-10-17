-- ── team_members.accounts_hidden ────────────────────────────────────────────────
-- Hides a member card in Finance → Conti Member (shared by all Finance users).
-- Display-only: it does NOT affect access, role or permissions (that is
-- `active` / `role`). Totals in Conti Member still include hidden members.
-- The /api/team auto-sync only inserts missing rows, so it never resets this.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS accounts_hidden boolean NOT NULL DEFAULT false;
