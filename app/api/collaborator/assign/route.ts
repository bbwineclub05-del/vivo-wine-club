import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

/**
 * GET  /api/collaborator/assign?eventSlug=...
 *   Returns list of all collaborators and whether each is assigned to the event.
 *
 * POST /api/collaborator/assign
 *   Body: { eventSlug, userId, assigned: boolean }
 *   Adds or removes the assignment.
 */

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const eventSlug = searchParams.get('eventSlug');
  if (!eventSlug) return NextResponse.json({ error: 'Missing eventSlug' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // List all collaborator users
  const { data: usersData, error: uErr } = await db.auth.admin.listUsers({ perPage: 200 });
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  const collaborators = (usersData?.users ?? []).filter(
    (u: { app_metadata?: { role?: string }; id: string; email?: string; user_metadata?: { full_name?: string } }) =>
      u.app_metadata?.role === 'collaborator'
  ).map((u: { id: string; email?: string; user_metadata?: { full_name?: string } }) => ({
    id: u.id,
    email: u.email ?? '',
    name: u.user_metadata?.full_name ?? u.email ?? '',
  }));

  // Get existing assignments for this event
  const { data: assignments } = await db
    .from('collaborator_events')
    .select('user_id')
    .eq('event_slug', eventSlug);

  const assignedIds = new Set((assignments ?? []).map((r: { user_id: string }) => r.user_id));

  const result = collaborators.map((c: { id: string; email: string; name: string }) => ({
    ...c,
    assigned: assignedIds.has(c.id),
  }));

  return NextResponse.json({ collaborators: result });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { eventSlug, userId, assigned } = await request.json() as {
    eventSlug: string;
    userId: string;
    assigned: boolean;
  };

  if (!eventSlug || !userId || typeof assigned !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  if (assigned) {
    const { error } = await db
      .from('collaborator_events')
      .upsert({ user_id: userId, event_slug: eventSlug }, { onConflict: 'user_id,event_slug' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db
      .from('collaborator_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_slug', eventSlug);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
