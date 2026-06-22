-- ── event_guests table ────────────────────────────────────────────────────────
-- Stores public guest registrations for events with guest_list_enabled = true.
-- Supports real-time check-in during events.

CREATE TABLE IF NOT EXISTS event_guests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid REFERENCES events(id) ON DELETE CASCADE,
  event_slug  text NOT NULL,
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  email       text NOT NULL,
  phone       text,
  checked_in  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_guests_event_slug_idx ON event_guests(event_slug);
CREATE INDEX IF NOT EXISTS event_guests_event_id_idx   ON event_guests(event_id);

-- Row-Level Security
ALTER TABLE event_guests ENABLE ROW LEVEL SECURITY;

-- Anonymous users can insert (public registration form)
CREATE POLICY "anon_insert_event_guests"
  ON event_guests FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users (staff/admin) can read and update
CREATE POLICY "auth_read_event_guests"
  ON event_guests FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_update_event_guests"
  ON event_guests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── Add guest_list_enabled to events ─────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS guest_list_enabled boolean NOT NULL DEFAULT false;

-- ── Enable Realtime ──────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE event_guests;
