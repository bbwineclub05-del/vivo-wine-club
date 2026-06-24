-- Referral system for events

-- One referral code per person per event
CREATE TABLE IF NOT EXISTS referral_codes (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text    UNIQUE NOT NULL,          -- e.g. VIVO-A3F7K
  event_slug   text    NOT NULL,
  owner_email  text    NOT NULL,
  owner_name   text    NOT NULL DEFAULT '',
  uses         int     NOT NULL DEFAULT 0,
  reward_unlocked boolean NOT NULL DEFAULT false,
  reward_code  text,                             -- e.g. DRINK-B2X9P (set when uses >= 5)
  created_at   timestamptz DEFAULT now(),
  UNIQUE (event_slug, owner_email)
);

-- One record per referred person per referral code
CREATE TABLE IF NOT EXISTS referral_uses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  used_by_email    text NOT NULL,
  event_slug       text NOT NULL,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (referral_code_id, used_by_email)
);

CREATE INDEX IF NOT EXISTS referral_codes_event_idx  ON referral_codes (event_slug);
CREATE INDEX IF NOT EXISTS referral_codes_email_idx  ON referral_codes (owner_email);
CREATE INDEX IF NOT EXISTS referral_uses_code_idx    ON referral_uses (referral_code_id);

-- RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses  ENABLE ROW LEVEL SECURITY;

-- Anyone can read referral_codes by code (for status widget), service role writes
CREATE POLICY "public_select_referral_codes"
  ON referral_codes FOR SELECT USING (true);

-- Only service role can insert/update/delete referral_codes
CREATE POLICY "service_insert_referral_codes"
  ON referral_codes FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_update_referral_codes"
  ON referral_codes FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_delete_referral_codes"
  ON referral_codes FOR DELETE TO service_role USING (true);

-- referral_uses: service role only
CREATE POLICY "service_all_referral_uses"
  ON referral_uses FOR ALL TO service_role USING (true) WITH CHECK (true);
