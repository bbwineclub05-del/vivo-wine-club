-- Atomic check + decrement (returns false if insufficient stock)
CREATE OR REPLACE FUNCTION check_and_decrement_stock(
  p_product_id UUID,
  p_variant_id UUID,
  p_size TEXT,
  p_qty INT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_current INT;
BEGIN
  SELECT quantity INTO v_current
  FROM product_stock
  WHERE product_id = p_product_id
    AND (variant_id IS NOT DISTINCT FROM p_variant_id)
    AND (size       IS NOT DISTINCT FROM p_size)
  FOR UPDATE;
  IF v_current IS NULL OR v_current < p_qty THEN RETURN FALSE; END IF;
  UPDATE product_stock
     SET quantity = quantity - p_qty, updated_at = NOW()
   WHERE product_id = p_product_id
     AND (variant_id IS NOT DISTINCT FROM p_variant_id)
     AND (size       IS NOT DISTINCT FROM p_size);
  RETURN TRUE;
END;$$;

-- Stock audit log
CREATE TABLE IF NOT EXISTS stock_audit_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID        NOT NULL,
  variant_id  UUID,
  size        TEXT,
  old_qty     INT         NOT NULL,
  new_qty     INT         NOT NULL,
  reason      TEXT        NOT NULL, -- 'manual', 'sale', 'oversell'
  changed_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stock_audit_log_product_idx ON stock_audit_log(product_id, created_at DESC);
