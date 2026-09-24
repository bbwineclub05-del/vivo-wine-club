-- Optional Google Maps link for shuttle parking, shown in the guest-list
-- confirmation email when set (see app/api/events/[slug]/guests/route.ts).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS parking_map_url text;
