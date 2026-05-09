import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Build event price/title lookup from DB
    const EVENT_PRICE: Record<string, number> = {};
    const EVENT_TITLE: Record<string, string> = {};
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: eventsData } = await (supabase as any)
        .from('events').select('slug, title, price');
      for (const e of (eventsData ?? [])) {
        EVENT_PRICE[e.slug] = e.price ?? 0;
        EVENT_TITLE[e.slug] = e.title ?? e.slug;
      }
    } catch {/* non-fatal */}

    // 1. Fetch all auth users (up to 1000)
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) throw authErr;

    // 2. Fetch all tickets grouped by buyer_email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tickets, error: ticketErr } = await (supabase as any)
      .from('tickets')
      .select('buyer_email, event_id, ticket_count, created_at');

    if (ticketErr) console.error('[crm/members] tickets error:', ticketErr.message);

    // Aggregate tickets by email
    const ticketsByEmail: Record<string, { events: string[]; spend: number; count: number }> = {};
    for (const t of (tickets ?? [])) {
      const email = t.buyer_email?.toLowerCase();
      if (!email) continue;
      if (!ticketsByEmail[email]) ticketsByEmail[email] = { events: [], spend: 0, count: 0 };
      const title = EVENT_TITLE[t.event_id] ?? t.event_id;
      if (!ticketsByEmail[email].events.includes(title)) {
        ticketsByEmail[email].events.push(title);
      }
      ticketsByEmail[email].spend += (EVENT_PRICE[t.event_id] ?? 0) * (t.ticket_count ?? 1);
      ticketsByEmail[email].count += t.ticket_count ?? 1;
    }

    // 3. Build member list
    const members = users.map((u) => {
      const email = (u.email ?? '').toLowerCase();
      const meta  = u.user_metadata ?? {};
      const td    = ticketsByEmail[email] ?? { events: [], spend: 0, count: 0 };
      return {
        id:          u.id,
        email:       u.email ?? '',
        name:        meta.full_name ?? meta.name ?? u.email?.split('@')[0] ?? 'Unknown',
        created_at:  u.created_at,
        last_sign_in: u.last_sign_in_at ?? null,
        tier:        u.app_metadata?.role === 'staff' ? 'Staff' : 'Member',
        events:      td.events,
        tickets:     td.count,
        spend:       td.spend,
      };
    });

    // Sort: most active first
    members.sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));

    return NextResponse.json({ members, total: members.length });
  } catch (err) {
    console.error('[crm/members]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
