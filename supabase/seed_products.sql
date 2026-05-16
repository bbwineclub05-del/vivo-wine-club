-- Seed all static merch products into the products table.
-- Run once via Supabase SQL Editor or: supabase db execute --file supabase/seed_products.sql
-- Idempotent: uses INSERT ... ON CONFLICT (title) DO NOTHING
-- (add a UNIQUE constraint on title first, or just run once on a clean table)

INSERT INTO products (title, description, price, sizes, images, visible, sort_order, created_at, updated_at)
VALUES
  -- ── Wear The Club (real product photos) ──────────────────────────────────
  (
    'Classic Tee',
    'Soft 100% cotton tee with embroidered club crest.',
    35,
    ARRAY['S','M','L','XL'],
    ARRAY['/merch/maglietta.png'],
    true, 1, now(), now()
  ),
  (
    'Club Hoodie',
    'Heavyweight fleece with chest logo.',
    65,
    ARRAY['S','M','L','XL'],
    ARRAY['/merch/felpa.png'],
    true, 2, now(), now()
  ),
  (
    'Club Cap',
    'Structured 6-panel cap with tonal logo.',
    30,
    ARRAY[]::text[],
    ARRAY['/merch/cappellino.png'],
    true, 3, now(), now()
  ),
  (
    'Tote Bag',
    'Heavy canvas tote — fits two bottles.',
    25,
    ARRAY[]::text[],
    ARRAY['/merch/totebag.png'],
    true, 4, now(), now()
  ),
  (
    'Wine Carrier',
    'Insulated carrier for up to 4 bottles.',
    45,
    ARRAY[]::text[],
    ARRAY['/merch/portabicchiere.png'],
    true, 5, now(), now()
  ),
  (
    'Wine Glass',
    'Crystal-clear glass with engraved club logo.',
    18,
    ARRAY[]::text[],
    ARRAY['/merch/bicchiere.png'],
    true, 6, now(), now()
  ),
  (
    'Corkscrew',
    'Professional-grade waiter''s corkscrew.',
    20,
    ARRAY[]::text[],
    ARRAY['/merch/cavatappi.png'],
    true, 7, now(), now()
  ),
  (
    'IQOS Case',
    'Slim protective case with Vivo Wine Club branding.',
    22,
    ARRAY[]::text[],
    ARRAY['/merch/iqos.png'],
    true, 8, now(), now()
  ),
  -- ── Boutique / Accessories ────────────────────────────────────────────────
  (
    'Decanter Crystal Premium',
    'Hand-blown crystal decanter, limited numbered edition.',
    120,
    ARRAY[]::text[],
    ARRAY[]::text[],
    true, 9, now(), now()
  ),
  (
    'Bordeaux Crystal Set',
    'Set of 4 Riedel crystal glasses, ideal for great Bordeaux wines.',
    89,
    ARRAY[]::text[],
    ARRAY[]::text[],
    true, 10, now(), now()
  ),
  (
    'Luxury Wine Journal',
    'Full-leather bound tasting diary, 365 acid-free pages.',
    55,
    ARRAY[]::text[],
    ARRAY[]::text[],
    true, 11, now(), now()
  ),
  (
    'Sommelier Kit Pro',
    'Professional set: corkscrew, foil cutter, thermometer, aerator, goutte.',
    75,
    ARRAY[]::text[],
    ARRAY[]::text[],
    true, 12, now(), now()
  ),
  (
    'Tote Bag Premium',
    'Heavy canvas wine carrier, holds 6 bottles, gold embroidered logo.',
    35,
    ARRAY[]::text[],
    ARRAY[]::text[],
    true, 13, now(), now()
  ),
  (
    'Exclusive Gift Box',
    'Curated gift box: selected wine, glass, accessories and quarterly membership.',
    185,
    ARRAY[]::text[],
    ARRAY[]::text[],
    true, 14, now(), now()
  ),
  (
    'T-Shirt Pima Cotton',
    'Unisex 100% Pima cotton t-shirt, gold thread embroidered logo.',
    45,
    ARRAY['S','M','L','XL'],
    ARRAY[]::text[],
    true, 15, now(), now()
  ),
  (
    'Membership Gold',
    'Annual Gold membership with unlimited access to all club events.',
    299,
    ARRAY[]::text[],
    ARRAY[]::text[],
    true, 16, now(), now()
  )
;
