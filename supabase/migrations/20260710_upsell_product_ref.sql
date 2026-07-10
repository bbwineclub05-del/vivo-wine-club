-- Restructure upsell_configs to reference products directly instead of manual fields
-- The table is new and empty so we can safely drop columns and add FK

ALTER TABLE upsell_configs DROP COLUMN IF EXISTS title;
ALTER TABLE upsell_configs DROP COLUMN IF EXISTS image_url;
ALTER TABLE upsell_configs DROP COLUMN IF EXISTS price;
ALTER TABLE upsell_configs DROP COLUMN IF EXISTS original_price;
ALTER TABLE upsell_configs DROP COLUMN IF EXISTS discount_percent;
ALTER TABLE upsell_configs DROP COLUMN IF EXISTS custom_message;

-- Add product FK
ALTER TABLE upsell_configs
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE CASCADE;

-- Unique index: one row per (product, context, target_slug)
-- NULL target_slug = "all targets" handled via separate index
CREATE UNIQUE INDEX IF NOT EXISTS upsell_configs_unique_with_target
  ON upsell_configs (product_id, context, target_slug)
  WHERE target_slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS upsell_configs_unique_no_target
  ON upsell_configs (product_id, context)
  WHERE target_slug IS NULL;
