-- ── RLS policies for `events` ────────────────────────────────────────────────
-- The events table has RLS enabled but no policies — this blocks all anon/user
-- direct queries. All server-side API routes use service role (bypass RLS) so
-- they're unaffected, but direct client queries and Realtime channel auth fail.

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anon users can read published events (public pages, Realtime)
CREATE POLICY "anon_select_published_events"
  ON events FOR SELECT TO anon
  USING (published = true);

-- Authenticated users (admin/staff/members/collaborators) can read all events
CREATE POLICY "auth_select_events"
  ON events FOR SELECT TO authenticated
  USING (true);

-- Only admin/staff can insert, update, delete events
-- (Service role bypasses this anyway, but belt-and-suspenders for direct calls)
CREATE POLICY "admin_staff_write_events"
  ON events FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['admin', 'staff'])
    OR auth.email() = ANY (ARRAY[
      'giacomogallo1310@gmail.com',
      'filippo.lombardi890@gmail.com',
      'cristianomichelotti@gmail.com',
      'riccardo.consalvo@icloud.com'
    ])
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['admin', 'staff'])
    OR auth.email() = ANY (ARRAY[
      'giacomogallo1310@gmail.com',
      'filippo.lombardi890@gmail.com',
      'cristianomichelotti@gmail.com',
      'riccardo.consalvo@icloud.com'
    ])
  );


-- ── RLS policies for `collaborator_events` ───────────────────────────────────
-- This table links collaborators (by user_id) to event slugs.
-- No policies existed — with RLS enabled this blocked all non-service-role access.

-- Collaborators can read their own assignments
CREATE POLICY "collaborator_select_own"
  ON collaborator_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/staff can read and write all assignments
CREATE POLICY "admin_staff_all_collaborator_events"
  ON collaborator_events FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['admin', 'staff'])
    OR auth.email() = ANY (ARRAY[
      'giacomogallo1310@gmail.com',
      'filippo.lombardi890@gmail.com',
      'cristianomichelotti@gmail.com',
      'riccardo.consalvo@icloud.com'
    ])
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['admin', 'staff'])
    OR auth.email() = ANY (ARRAY[
      'giacomogallo1310@gmail.com',
      'filippo.lombardi890@gmail.com',
      'cristianomichelotti@gmail.com',
      'riccardo.consalvo@icloud.com'
    ])
  );
