-- ═══════════════════════════════════════════════════════════════════════════
-- Vivo Wine Club — cumulative migrations
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Missing columns ───────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shipping_cost numeric(10,2) DEFAULT NULL;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS display_name text DEFAULT NULL;


-- ── 2. Row Level Security — enable on merch tables ───────────────────────────
-- (No-op if already enabled; safe to run multiple times.)

ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock     ENABLE ROW LEVEL SECURITY;
ALTER TABLE merch_orders      ENABLE ROW LEVEL SECURITY;


-- ── 3. SELECT policies ───────────────────────────────────────────────────────
-- API routes use the service-role (admin) client which bypasses RLS entirely.
-- These policies are required so that Supabase Realtime `postgres_changes`
-- subscriptions deliver events to authenticated users (the admin JWT is sent
-- via supabase.realtime.setAuth(token) in MerchManager / TaskBoard / etc.).
-- Without a matching SELECT policy the subscription connects but never fires.

-- products: all authenticated users can read all rows
DROP POLICY IF EXISTS "authenticated_select_products" ON products;
CREATE POLICY "authenticated_select_products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- products: anonymous users (public shop, CDN) see only visible products
DROP POLICY IF EXISTS "anon_select_visible_products" ON products;
CREATE POLICY "anon_select_visible_products"
  ON products FOR SELECT
  TO anon
  USING (visible = true);

-- product_variants: authenticated users can read all variants
DROP POLICY IF EXISTS "authenticated_select_product_variants" ON product_variants;
CREATE POLICY "authenticated_select_product_variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (true);

-- product_variants: anonymous users can read variants of visible products
DROP POLICY IF EXISTS "anon_select_product_variants" ON product_variants;
CREATE POLICY "anon_select_product_variants"
  ON product_variants FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND p.visible = true
    )
  );

-- product_stock: authenticated users can read stock
DROP POLICY IF EXISTS "authenticated_select_product_stock" ON product_stock;
CREATE POLICY "authenticated_select_product_stock"
  ON product_stock FOR SELECT
  TO authenticated
  USING (true);

-- product_stock: anonymous users can read stock for visible products
DROP POLICY IF EXISTS "anon_select_product_stock" ON product_stock;
CREATE POLICY "anon_select_product_stock"
  ON product_stock FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_stock.product_id
        AND p.visible = true
    )
  );

-- merch_orders: only authenticated users can read orders (staff/admin via API)
DROP POLICY IF EXISTS "authenticated_select_merch_orders" ON merch_orders;
CREATE POLICY "authenticated_select_merch_orders"
  ON merch_orders FOR SELECT
  TO authenticated
  USING (true);


-- ── 4. Realtime publication ──────────────────────────────────────────────────
-- Tables must be in the supabase_realtime publication to fire postgres_changes.
-- Adding a table that is already in the publication is a no-op.

ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE product_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE merch_orders;


-- ── 5. Product page columns ──────────────────────────────────────────────────

-- slug: human-readable URL key for /wear-the-club/[slug]
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);

-- details: editable product info block (material, care instructions, shipping note)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS details jsonb DEFAULT NULL;


-- ── 6. Text variants ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_text_variants (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  text_label text NOT NULL,
  images     text[] DEFAULT '{}' NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_text_variants_product_id_idx
  ON product_text_variants(product_id);

ALTER TABLE product_text_variants ENABLE ROW LEVEL SECURITY;

-- authenticated users can read all text variants
DROP POLICY IF EXISTS "authenticated_select_product_text_variants" ON product_text_variants;
CREATE POLICY "authenticated_select_product_text_variants"
  ON product_text_variants FOR SELECT
  TO authenticated
  USING (true);

-- anonymous users can read text variants of visible products
DROP POLICY IF EXISTS "anon_select_product_text_variants" ON product_text_variants;
CREATE POLICY "anon_select_product_text_variants"
  ON product_text_variants FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_text_variants.product_id
        AND p.visible = true
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE product_text_variants;


-- ── 7. Variant combinations ───────────────────────────────────────────────────
-- Links a text variant + a color variant to a specific set of images.
-- One row per (text_variant_id, color_variant_id) pair.

CREATE TABLE IF NOT EXISTS product_variant_combinations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id       uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  text_variant_id  uuid REFERENCES product_text_variants(id) ON DELETE CASCADE NOT NULL,
  color_variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
  images           text[] DEFAULT '{}' NOT NULL,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (text_variant_id, color_variant_id)
);

CREATE INDEX IF NOT EXISTS product_variant_combinations_product_id_idx
  ON product_variant_combinations(product_id);

CREATE INDEX IF NOT EXISTS product_variant_combinations_text_variant_id_idx
  ON product_variant_combinations(text_variant_id);

ALTER TABLE product_variant_combinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_product_variant_combinations" ON product_variant_combinations;
CREATE POLICY "authenticated_select_product_variant_combinations"
  ON product_variant_combinations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_select_product_variant_combinations" ON product_variant_combinations;
CREATE POLICY "anon_select_product_variant_combinations"
  ON product_variant_combinations FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variant_combinations.product_id
        AND p.visible = true
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE product_variant_combinations;
