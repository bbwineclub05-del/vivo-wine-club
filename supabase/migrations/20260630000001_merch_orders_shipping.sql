-- Add shipping/contact fields to merch_orders
ALTER TABLE merch_orders
  ADD COLUMN IF NOT EXISTS shipping_line1    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_line2    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city     TEXT,
  ADD COLUMN IF NOT EXISTS shipping_postal   TEXT,
  ADD COLUMN IF NOT EXISTS shipping_state    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country  TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes    TEXT;
