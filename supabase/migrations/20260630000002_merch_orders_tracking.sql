-- Add shipment tracking fields to merch_orders
ALTER TABLE merch_orders
  ADD COLUMN IF NOT EXISTS carrier        TEXT,
  ADD COLUMN IF NOT EXISTS tracking_code  TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url   TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at     DATE,
  ADD COLUMN IF NOT EXISTS shipping_notes TEXT;
-- status column is already TEXT; 'spedito' is now a valid third state
