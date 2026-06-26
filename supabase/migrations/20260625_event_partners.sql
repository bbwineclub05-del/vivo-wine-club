-- Event partner tracking
-- Partners are organisations/groups with fixed tracking links per event.
-- Different from referral codes (those are auto-generated per user).

CREATE TABLE IF NOT EXISTS event_partners (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_slug  text        NOT NULL,
  name        text        NOT NULL,
  code        text        UNIQUE NOT NULL,   -- e.g. ORG-A3F7K
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_partners_slug_idx ON event_partners (event_slug);
CREATE INDEX IF NOT EXISTS event_partners_code_idx ON event_partners (code);

-- Track which partner brought each guest/ticket
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS partner_code text;
CREATE INDEX IF NOT EXISTS event_guests_partner_idx ON event_guests (partner_code);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS partner_code text;
CREATE INDEX IF NOT EXISTS tickets_partner_idx ON tickets (partner_code);

-- RLS: only service role can write; anon can SELECT for code lookup
ALTER TABLE event_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_event_partners"
  ON event_partners FOR SELECT USING (true);

CREATE POLICY "service_insert_event_partners"
  ON event_partners FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_update_event_partners"
  ON event_partners FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_delete_event_partners"
  ON event_partners FOR DELETE TO service_role USING (true);
