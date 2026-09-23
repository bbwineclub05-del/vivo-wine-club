-- ── crm_custom_contacts.last_reminder_sent_at ───────────────────────────────────
-- Tracks when a manual reminder email was last sent to a contact, so staff can
-- see at a glance who has already been contacted. NULL = never reminded.
ALTER TABLE crm_custom_contacts
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;
