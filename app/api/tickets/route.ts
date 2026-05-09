import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/tickets?event_id=<slug>
 * Returns all tickets for a given event.
 * Requires authenticated staff user.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('event_id');

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tickets, error } = await (getSupabaseAdmin() as any)
    .from('tickets')
    .select('order_id, buyer_name, buyer_email, ticket_count, scanned, scanned_at, scanned_by')
    .eq('event_id', eventId)
    .order('scanned', { ascending: true })
    .order('buyer_name', { ascending: true });

  if (error) {
    console.error('[tickets] DB error:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ tickets: tickets ?? [] });
}
