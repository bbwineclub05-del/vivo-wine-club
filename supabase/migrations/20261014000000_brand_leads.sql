-- ── brand_leads ───────────────────────────────────────────────────────────────
-- Enquiries submitted from /brands (POST /api/brand-leads).
--
-- This migration only CREATEs. It does not touch events, tickets, orders,
-- payments or any existing table, so it is safe to run while events are live.
--
-- RLS is enabled with no policies, exactly like ambassador_applications:
-- only the service role (the API route) can read or write. Anon and
-- authenticated clients get nothing, so the public form posts through the
-- API rather than straight into the table.

CREATE TABLE IF NOT EXISTS public.brand_leads (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  status                      text NOT NULL DEFAULT 'new'
                              CHECK (status IN ('new', 'in_review', 'won', 'lost')),
  company                     text NOT NULL,
  contact_name                text NOT NULL,
  email                       text NOT NULL,
  phone                       text,
  project_type                text NOT NULL,
  message                     text NOT NULL,
  locale                      text,
  consent_privacy_accepted_at timestamptz NOT NULL,
  consent_privacy_version     text NOT NULL,
  consent_ip                  text,
  staff_notes                 text
);

CREATE INDEX IF NOT EXISTS brand_leads_status_idx ON public.brand_leads (status);
CREATE INDEX IF NOT EXISTS brand_leads_email_idx  ON public.brand_leads (email, created_at DESC);
CREATE INDEX IF NOT EXISTS brand_leads_ip_idx     ON public.brand_leads (consent_ip, created_at DESC);

ALTER TABLE public.brand_leads ENABLE ROW LEVEL SECURITY;
