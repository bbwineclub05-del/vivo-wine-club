-- Add referral_enabled flag to events.
-- When false (default): no referral codes are generated, no widget shown.
-- When true: only valid for paid events (is_list_only = false, price > 0).
ALTER TABLE events ADD COLUMN IF NOT EXISTS referral_enabled BOOLEAN NOT NULL DEFAULT false;
