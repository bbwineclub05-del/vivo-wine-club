import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';

/**
 * POST /api/collaborator/checkin
 * Body: { guestId: string, eventSlug: string, checkedIn: boolean }
 * Toggles the checked_in state for a guest in an event the collaborator is assigned to.
 */
export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  if (!auth.isCollaborator && !auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { guestId, eventSlug, checkedIn } = body as {
    guestId: string;
    eventSlug: string;
    checkedIn: boolean;
  };

  if (!guestId || !eventSlug || typeof checkedIn !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Verify this collaborator is assigned to this event (admins bypass)
  if (!auth.isAdmin) {
    const { data: assignment } = await db
      .from('collaborator_events')
      .select('event_slug')
      .eq('user_id', auth.userId)
      .eq('event_slug', eventSlug)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ error: 'Not assigned to this event' }, { status: 403 });
    }
  }

  const { error } = await db
    .from('event_guests')
    .update({ checked_in: checkedIn })
    .eq('id', guestId)
    .eq('event_slug', eventSlug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
