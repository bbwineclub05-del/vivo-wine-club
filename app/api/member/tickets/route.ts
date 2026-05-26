import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, type DbEvent, type EventData } from '@/lib/events';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const { data: tickets, error } = await db
      .from('tickets')
      .select('order_id, event_id, name, checked_in')
      .eq('email', auth.email)
      .order('order_id', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch event data for each unique event_id
    const eventIds: string[] = [...new Set<string>((tickets ?? []).map((t: { event_id: string }) => t.event_id))];
    const eventMap = new Map<string, EventData | null>();

    await Promise.all(
      eventIds.map(async (slug) => {
        const { data } = await db
          .from('events')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        eventMap.set(slug, data ? dbEventToEventData(data as DbEvent) : null);
      }),
    );

    const result = (tickets ?? []).map((t: { order_id: string; event_id: string; name: string; checked_in: boolean }) => ({
      order_id:   t.order_id,
      event_id:   t.event_id,
      name:       t.name,
      checked_in: t.checked_in,
      event:      eventMap.get(t.event_id) ?? null,
    }));

    return NextResponse.json({ tickets: result });
  } catch (err) {
    console.error('[/api/member/tickets] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
