-- Add partner_code to referral_codes so it propagates through the referral chain.
-- When Person A (who came via a partner link) refers Person B,
-- Person B's registration gets attributed to the same partner.
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS partner_code text;
