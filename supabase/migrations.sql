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


-- ── 8. Member discounts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_discounts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text,
  logo_url    text,
  code        text,
  partner     text,
  expires_at  date,
  visible     boolean DEFAULT true NOT NULL,
  sort_order  integer DEFAULT 0 NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE member_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_member_discounts" ON member_discounts;
CREATE POLICY "authenticated_select_member_discounts"
  ON member_discounts FOR SELECT
  TO authenticated
  USING (visible = true);

ALTER PUBLICATION supabase_realtime ADD TABLE member_discounts;


-- ── 9. Member profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text,
  city           text,
  wine_interests text[] DEFAULT '{}' NOT NULL,
  avatar_url     text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_owner_select" ON profiles;
CREATE POLICY "profiles_owner_select"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_owner_modify" ON profiles;
CREATE POLICY "profiles_owner_modify"
  ON profiles FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  category    text        NOT NULL DEFAULT 'Altro',
  file_path   text        NOT NULL,
  file_name   text        NOT NULL,
  file_size   bigint,
  uploaded_by text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);


-- ── 10. Membership card columns + tickets columns ────────────────────────────

-- Add card-related columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS member_id    text UNIQUE,
  ADD COLUMN IF NOT EXISTS tier         text,
  ADD COLUMN IF NOT EXISTS member_since integer;

-- Add ticketing columns to tickets
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS email_sent      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_status  text    NOT NULL DEFAULT 'pending';


-- ── 11. Backfill member_id / tier / member_since / full_name into profiles ────
-- Deterministic member ID: 'VIVO-' + hex chars at 0-indexed positions 0,8,16,24
-- of the UUID with dashes removed (SUBSTRING uses 1-based indexing → +1).

UPDATE profiles p
SET
  member_id    = COALESCE(p.member_id, 'VIVO-' || UPPER(
                   SUBSTRING(REPLACE(p.id::text, '-', ''), 1, 1) ||
                   SUBSTRING(REPLACE(p.id::text, '-', ''), 9, 1) ||
                   SUBSTRING(REPLACE(p.id::text, '-', ''), 17, 1) ||
                   SUBSTRING(REPLACE(p.id::text, '-', ''), 25, 1)
                 )),
  tier         = COALESCE(p.tier, CASE
                   WHEN (u.raw_app_meta_data->>'role') = 'admin' THEN 'Founder'
                   WHEN (u.raw_app_meta_data->>'role') = 'staff' THEN 'Staff'
                   ELSE 'Member'
                 END),
  member_since = COALESCE(p.member_since, EXTRACT(YEAR FROM u.created_at)::integer),
  full_name    = COALESCE(p.full_name,
                   u.raw_user_meta_data->>'full_name',
                   u.raw_user_meta_data->>'name')
FROM auth.users u
WHERE p.id = u.id;

-- Insert profile rows for auth.users who have no profile yet
INSERT INTO profiles (id, member_id, tier, member_since, full_name, wine_interests)
SELECT
  u.id,
  'VIVO-' || UPPER(
    SUBSTRING(REPLACE(u.id::text, '-', ''), 1, 1) ||
    SUBSTRING(REPLACE(u.id::text, '-', ''), 9, 1) ||
    SUBSTRING(REPLACE(u.id::text, '-', ''), 17, 1) ||
    SUBSTRING(REPLACE(u.id::text, '-', ''), 25, 1)
  ),
  CASE
    WHEN (u.raw_app_meta_data->>'role') = 'admin' THEN 'Founder'
    WHEN (u.raw_app_meta_data->>'role') = 'staff' THEN 'Staff'
    ELSE 'Member'
  END,
  EXTRACT(YEAR FROM u.created_at)::integer,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  '{}'::text[]
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;


-- ── 12. Public read policy on profiles for card share page ───────────────────
-- The public card page at /card/[memberId] reads full_name, tier, member_since
-- using the service-role (admin) client — RLS is bypassed for those calls.
-- This policy exists so future anon/client reads also work if needed.

DROP POLICY IF EXISTS "anon_select_card_fields" ON profiles;
CREATE POLICY "anon_select_card_fields"
  ON profiles FOR SELECT
  TO anon
  USING (member_id IS NOT NULL);


-- ── 13. Sponsors table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sponsors (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text,
  phone      text,
  city       text,
  website    text,
  notes      text,
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsors_admin_all" ON sponsors;
CREATE POLICY "sponsors_admin_all"
  ON sponsors FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── 14. Transactions table (Finance section) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date        NOT NULL,
  description text        NOT NULL,
  category    text        NOT NULL, -- Evento | Membership | Sponsorship | Merchandise | Affitto | Marketing | Altro
  type        text        NOT NULL CHECK (type IN ('revenue', 'cost')),
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  notes       text,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_authenticated_all" ON transactions;
CREATE POLICY "transactions_authenticated_all"
  ON transactions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
