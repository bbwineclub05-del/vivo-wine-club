-- ── crm_custom_contacts.source_ticket_id ────────────────────────────────────────
-- Links an auto-synced CRM contact back to the exact tickets row it came from
-- (tickets.order_id, e.g. "VWC-...-1"). NULL for manually-added contacts.
-- A plain UNIQUE constraint on a nullable column still allows unlimited NULLs
-- (NULL is never equal to NULL for uniqueness purposes) — so manual contacts
-- are unaffected, while two distinct tickets from the same order (qty > 1)
-- each still get their own row, and a given ticket is never synced twice.
--
-- NOTE: this must be a full (non-partial) unique constraint/index — Postgres
-- cannot use a partial unique index as an ON CONFLICT arbiter unless the same
-- WHERE predicate is repeated in the INSERT statement, which PostgREST/
-- supabase-js .upsert() does not support.
ALTER TABLE crm_custom_contacts
  ADD COLUMN IF NOT EXISTS source_ticket_id text;

ALTER TABLE crm_custom_contacts
  ADD CONSTRAINT crm_custom_contacts_source_ticket_id_key UNIQUE (source_ticket_id);
