import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';

/**
 * GET /api/collaborator/events
 * Returns the events assigned to the authenticated collaborator,
 * each with its guest list (sorted alphabetically by last_name, first_name).
 */
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  if (!auth.isCollaborator && !auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Get assigned event slugs
  const { data: assignments, error: aErr } = await db
    .from('collaborator_events')
    .select('event_slug')
    .eq('user_id', auth.userId);

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  const slugs: string[] = (assignments ?? []).map((r: { event_slug: string }) => r.event_slug);

  if (slugs.length === 0) {
    return NextResponse.json({ events: [] });
  }

  // Fetch event details
  const { data: events, error: eErr } = await db
    .from('events')
    .select('id, title, slug, date, location')
    .in('slug', slugs);

  if (eErr) {
    return NextResponse.json({ error: eErr.message }, { status: 500 });
  }

  // Fetch guests for all assigned events in one query
  const { data: allGuests, error: gErr } = await db
    .from('event_guests')
    .select('id, event_slug, first_name, last_name, email, phone, checked_in, created_at')
    .in('event_slug', slugs)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (gErr) {
    return NextResponse.json({ error: gErr.message }, { status: 500 });
  }

  // Group guests by event slug
  const guestsBySlug: Record<string, typeof allGuests> = {};
  for (const g of allGuests ?? []) {
    if (!guestsBySlug[g.event_slug]) guestsBySlug[g.event_slug] = [];
    guestsBySlug[g.event_slug].push(g);
  }

  const result = (events ?? []).map((ev: { id: string; title: string; slug: string; date: string; location: string }) => ({
    ...ev,
    guests: guestsBySlug[ev.slug] ?? [],
  }));

  return NextResponse.json({ events: result });
}
