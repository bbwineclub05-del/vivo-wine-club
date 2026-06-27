-- Dynamic wineries table: auto-created from past winery_visit events.
-- Separate from the 48 hardcoded wineries in lib/wineries.ts.
-- Admin can update name, logo_url, description, region, country via MediaManager.

CREATE TABLE IF NOT EXISTS wineries (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  logo_url    TEXT,
  region      TEXT NOT NULL DEFAULT '',
  country     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  visit_date  DATE,
  event_slug  TEXT,   -- the event that originated this winery entry
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Public read (so winery pages and the visits page can fetch without auth)
ALTER TABLE wineries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_wineries" ON wineries
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_all_wineries" ON wineries
  FOR ALL TO service_role USING (true) WITH CHECK (true);
