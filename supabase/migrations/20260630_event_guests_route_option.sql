-- Add route_option to event_guests (for Vivo Wine Ride and future events with route selection)
-- NULL for all other events where this field is not applicable.
ALTER TABLE event_guests
  ADD COLUMN IF NOT EXISTS route_option TEXT;
