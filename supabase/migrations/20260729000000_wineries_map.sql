-- Wine Visits Map (member area): coordinates + photo gallery per winery,
-- and a normalised child table for wines tasted (editable by admin/staff).

ALTER TABLE wineries
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- null = no coordinates yet; true = precise geocode match; false = approximate
  -- (region/appellation-level) match — surfaced in the admin map manager so
  -- staff know which pins are worth double-checking.
  ADD COLUMN IF NOT EXISTS coords_precise boolean;

CREATE TABLE IF NOT EXISTS winery_wines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_slug      text NOT NULL REFERENCES wineries(slug) ON DELETE CASCADE,
  name             text NOT NULL DEFAULT '',
  vintage          integer,
  grape            text NOT NULL DEFAULT '',
  rating           numeric,
  note             text NOT NULL DEFAULT '',
  bottle_photo_url text,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS winery_wines_winery_slug_idx ON winery_wines(winery_slug);

ALTER TABLE winery_wines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_winery_wines" ON winery_wines
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_all_winery_wines" ON winery_wines
  FOR ALL TO service_role USING (true) WITH CHECK (true);
