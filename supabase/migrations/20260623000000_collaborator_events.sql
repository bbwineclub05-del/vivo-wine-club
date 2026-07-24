-- Table linking collaborators to the events they are assigned to check in
CREATE TABLE IF NOT EXISTS collaborator_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,           -- Supabase Auth user id (app_metadata.role = 'collaborator')
  event_slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, event_slug)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS collaborator_events_user_idx ON collaborator_events (user_id);
