-- GDPR consent logging: privacy/terms acceptance (timestamp + document version),
-- optional marketing/photo-video/age-confirmation flags, and the collecting IP.

-- A) Event list signup
ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS consent_privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_privacy_version text,
  ADD COLUMN IF NOT EXISTS consent_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_marketing_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text;

-- B) Event ticket purchase
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS consent_privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_privacy_version text,
  ADD COLUMN IF NOT EXISTS consent_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_terms_version text,
  ADD COLUMN IF NOT EXISTS consent_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_marketing_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_photo_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_ip text;

-- C) Wear The Club (merch) orders
ALTER TABLE public.merch_orders
  ADD COLUMN IF NOT EXISTS consent_privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_privacy_version text,
  ADD COLUMN IF NOT EXISTS consent_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_terms_version text,
  ADD COLUMN IF NOT EXISTS consent_ip text;

-- D) Membership application
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS consent_privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_privacy_version text,
  ADD COLUMN IF NOT EXISTS consent_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_marketing_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_age_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_ip text;
