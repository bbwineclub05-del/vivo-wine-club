-- ── crm_custom_categories ─────────────────────────────────────────────────────
-- User-defined CRM sections (e.g. "Ristoranti", "DJ", "Location")
CREATE TABLE IF NOT EXISTS crm_custom_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── crm_custom_contacts ────────────────────────────────────────────────────────
-- Generic contacts for custom CRM categories
CREATE TABLE IF NOT EXISTS crm_custom_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES crm_custom_categories(id) ON DELETE CASCADE,
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_custom_contacts_category_idx ON crm_custom_contacts(category_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE crm_custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_contacts   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_crm_custom_categories"
  ON crm_custom_categories FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_crm_custom_contacts"
  ON crm_custom_contacts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
