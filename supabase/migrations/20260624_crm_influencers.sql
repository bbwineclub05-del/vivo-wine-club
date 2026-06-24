-- CRM Influencer contacts

CREATE TABLE IF NOT EXISTS contacts_influencers (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name         text        NOT NULL DEFAULT '',
  last_name          text        NOT NULL DEFAULT '',
  email              text        NOT NULL DEFAULT '',
  phone              text        NOT NULL DEFAULT '',
  instagram          text        NOT NULL DEFAULT '',
  tiktok             text        NOT NULL DEFAULT '',
  followers          int         NOT NULL DEFAULT 0,
  notes              text        NOT NULL DEFAULT '',
  status             text        NOT NULL DEFAULT 'Contattato',
  last_contact_date  date,
  created_at         timestamptz DEFAULT now()
);

-- Index for sorting/searching
CREATE INDEX IF NOT EXISTS contacts_influencers_name_idx ON contacts_influencers (last_name, first_name);
CREATE INDEX IF NOT EXISTS contacts_influencers_status_idx ON contacts_influencers (status);

-- RLS
ALTER TABLE contacts_influencers ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "service_all_influencers"
  ON contacts_influencers FOR ALL TO service_role USING (true) WITH CHECK (true);
