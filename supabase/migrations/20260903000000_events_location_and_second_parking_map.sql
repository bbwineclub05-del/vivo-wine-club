-- Optional Google Maps link for the event's own precise address, and a
-- second optional shuttle-parking link (some events need two parking spots).
-- Both shown in the guest-list confirmation email when set (see
-- app/api/events/[slug]/guests/route.ts).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_map_url text,
  ADD COLUMN IF NOT EXISTS parking_map_url_2 text;
