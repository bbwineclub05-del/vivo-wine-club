CREATE TABLE IF NOT EXISTS upsell_configs (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text    NOT NULL,
  image_url   text,
  price       numeric NOT NULL DEFAULT 0,
  original_price numeric,
  custom_message text,
  discount_percent int NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  context     text    NOT NULL DEFAULT 'event' CHECK (context IN ('event', 'merch')),
  target_slug text,   -- specific event/product slug; NULL = all
  sort_order  int     NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS upsell_analytics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upsell_config_id  uuid REFERENCES upsell_configs(id) ON DELETE SET NULL,
  event_type        text NOT NULL CHECK (event_type IN ('impression', 'added', 'removed', 'converted')),
  checkout_context  text,
  order_id          text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE upsell_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upsell_configs_read" ON upsell_configs
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "upsell_analytics_insert" ON upsell_analytics
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "upsell_analytics_read" ON upsell_analytics
  FOR SELECT TO authenticated USING (true);
