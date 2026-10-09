-- ── ambassador_applications ─────────────────────────────────────────────────────
-- Applications submitted from /collaborate/ambassador (POST /api/ambassador).
-- `area` holds the config value from lib/ambassador.ts (or 'other', with the
-- free-text area in `area_other`) so applications can be filtered by area.
-- `email` is stored lowercased by the API (used for the per-email rate limit).
-- RLS is enabled with no policies: only the service role (API route) can
-- read or write; anon/authenticated clients have no access.

CREATE TABLE IF NOT EXISTS public.ambassador_applications (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  status                      text NOT NULL DEFAULT 'new'
                              CHECK (status IN ('new', 'in_review', 'accepted', 'rejected')),
  first_name                  text NOT NULL,
  last_name                   text NOT NULL,
  email                       text NOT NULL,
  phone                       text,
  area                        text NOT NULL,
  area_other                  text,
  event_types                 text[] NOT NULL DEFAULT '{}',
  experience                  text NOT NULL,
  local_contacts              text,
  community                   text,
  linkedin_url                text,
  social_links                text,
  motivation                  text NOT NULL,
  availability                text NOT NULL,
  languages                   text NOT NULL,
  locale                      text,
  consent_privacy_accepted_at timestamptz NOT NULL,
  consent_privacy_version     text NOT NULL,
  consent_age_confirmed       boolean NOT NULL DEFAULT false,
  consent_ip                  text,
  staff_notes                 text
);

CREATE INDEX IF NOT EXISTS ambassador_applications_area_idx   ON public.ambassador_applications (area);
CREATE INDEX IF NOT EXISTS ambassador_applications_status_idx ON public.ambassador_applications (status);
CREATE INDEX IF NOT EXISTS ambassador_applications_email_idx  ON public.ambassador_applications (email, created_at DESC);
CREATE INDEX IF NOT EXISTS ambassador_applications_ip_idx     ON public.ambassador_applications (consent_ip, created_at DESC);

ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;
