import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/guest-counts
 * Returns all events that have at least 1 participant (guest list OR paid ticket),
 * sorted newest → oldest, with combined participant count.
 * Used by EventInviteModal to populate the "Partecipanti evento..." dropdown.
 *
 * Sources:
 *  - event_guests (free/invite-only events, field: event_slug)
 *  - tickets      (paid events, field: event_id = slug, payment_status = 'paid')
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Fetch from both sources in parallel
  const [guestsRes, ticketsRes] = await Promise.all([
    db.from('event_guests').select('event_slug'),
    db.from('tickets').select('event_id, email').eq('payment_status', 'paid'),
  ]);

  if (guestsRes.error) console.error('[guest-counts] event_guests error:', guestsRes.error);
  if (ticketsRes.error) console.error('[guest-counts] tickets error:', ticketsRes.error);

  // Build count map: slug → unique email count
  // Use Sets to avoid double-counting if the same person appears multiple times
  const emailsBySlug: Record<string, Set<string>> = {};

  for (const row of (guestsRes.data ?? []) as Array<{ event_slug: string }>) {
    if (!row.event_slug) continue;
    if (!emailsBySlug[row.event_slug]) emailsBySlug[row.event_slug] = new Set();
    // event_guests doesn't expose email in this select — just count rows
    emailsBySlug[row.event_slug].add(`_row_${emailsBySlug[row.event_slug].size}`);
  }

  for (const row of (ticketsRes.data ?? []) as Array<{ event_id: string; email: string }>) {
    if (!row.event_id) continue;
    if (!emailsBySlug[row.event_id]) emailsBySlug[row.event_id] = new Set();
    if (row.email) emailsBySlug[row.event_id].add(row.email.toLowerCase());
  }

  const slugs = Object.keys(emailsBySlug);
  if (slugs.length === 0) {
    return NextResponse.json({ events: [] });
  }

  // Fetch event titles + dates for those slugs
  const { data: eventsData, error: evtErr } = await db
    .from('events')
    .select('slug, title, date')
    .in('slug', slugs)
    .order('date', { ascending: false });

  if (evtErr) {
    console.error('[guest-counts] events fetch error:', evtErr);
    return NextResponse.json({ error: evtErr.message }, { status: 500 });
  }

  const events = ((eventsData ?? []) as Array<{ slug: string; title: string; date: string }>)
    .map(e => ({ slug: e.slug, title: e.title, date: e.date, count: emailsBySlug[e.slug]?.size ?? 0 }))
    .filter(e => e.count > 0);

  return NextResponse.json({ events });
}
