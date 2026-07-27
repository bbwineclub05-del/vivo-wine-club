import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { sectionFromType } from '@/lib/events';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekLabel(isoWeekStr: string): string {
  // "2026-W20" → "May 11"
  const [year, w] = isoWeekStr.split('-W');
  const jan1 = new Date(Number(year), 0, 1);
  const days = (Number(w) - 1) * 7;
  const monday = new Date(jan1.getTime() + days * 86400000);
  return monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Last N ISO weeks up to and including the current one. */
function lastWeeks(n: number, now: Date): string[] {
  const weeks: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    weeks.push(isoWeek(new Date(now.getTime() - i * 7 * 86400000)));
  }
  return weeks;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const filterSlug = searchParams.get('event_slug') ?? '';

    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const now = new Date();
    const MONTHS_BACK = 12;
    const revenueWindowStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1), 1);
    const revenueWindowStartUnix = Math.floor(revenueWindowStart.getTime() / 1000);

    // Build event price/title/date/section lookup from DB
    const EVENT_PRICE: Record<string, number> = {};
    const EVENT_TITLE: Record<string, string> = {};
    const EVENT_DATE: Record<string, string> = {};
    const EVENT_SECTION: Record<string, string> = {};
    let eventsList: { slug: string; title: string }[] = [];
    try {
      const { data: eventsData } = await db.from('events').select('slug, title, price, date, section, type').order('title', { ascending: true });
      for (const e of (eventsData ?? [])) {
        EVENT_PRICE[e.slug]   = e.price ?? 0;
        EVENT_TITLE[e.slug]   = e.title ?? e.slug;
        EVENT_DATE[e.slug]    = e.date ?? '';
        EVENT_SECTION[e.slug] = e.section ?? sectionFromType(e.type ?? '');
      }
      eventsList = (eventsData ?? []).map((e: { slug: string; title: string }) => ({
        slug: e.slug,
        title: e.title ?? e.slug,
      }));
    } catch {/* non-fatal */}

    // ── Build tickets query — filter at DB level when an event is selected ───
    // NOTE: each row in `tickets` is one individual ticket (checkout creates
    // one row per ticket via Array.from({ length: qty }, ...)).
    // There is no ticket_count column — count rows directly.
    let ticketsQuery = db
      .from('tickets')
      .select('event_id, name, email, created_at')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });
    if (filterSlug) {
      ticketsQuery = ticketsQuery.eq('event_id', filterSlug);
    }

    // event_guests uses event_slug (not event_id, which is the events.id uuid
    // here) to line up with tickets.event_id / EVENT_TITLE / EVENT_PRICE, which
    // are all keyed by slug.
    let guestsQuery = db
      .from('event_guests')
      .select('event_slug, created_at')
      .order('created_at', { ascending: false });
    if (filterSlug) {
      guestsQuery = guestsQuery.eq('event_slug', filterSlug);
    }

    // ── Parallel fetches ──────────────────────────────────────────────────────
    const [
      ticketsRes,
      guestsRes,
      customersRes,
      applicationsRes,
    ] = await Promise.allSettled([
      ticketsQuery,
      guestsQuery,
      db.from('customers').select('created_at').order('created_at', { ascending: true }),
      db.from('applications').select('id, status, created_at'),
    ]);

    // ── Tickets ───────────────────────────────────────────────────────────────
    const tickets: { event_id: string; name: string; email: string; created_at: string }[] =
      ticketsRes.status === 'fulfilled' ? ((ticketsRes.value.data as typeof tickets | null) ?? []) : [];
    const totalTickets = tickets.length;

    // ── Guest-list signups ───────────────────────────────────────────────────
    const guests: { event_slug: string; created_at: string }[] =
      guestsRes.status === 'fulfilled' ? ((guestsRes.value.data as typeof guests | null) ?? []) : [];
    const totalGuests = guests.length;

    // Group by event — tickets contribute revenue, list signups don't (free)
    const byEvent: Record<string, { tickets: number; guests: number; revenue: number; title: string }> = {};
    for (const t of tickets) {
      const slug  = t.event_id;
      const price = EVENT_PRICE[slug] ?? 0;
      if (!byEvent[slug]) byEvent[slug] = { tickets: 0, guests: 0, revenue: 0, title: EVENT_TITLE[slug] ?? slug };
      byEvent[slug].tickets += 1;
      byEvent[slug].revenue += price;
    }
    for (const g of guests) {
      const slug = g.event_slug;
      if (!byEvent[slug]) byEvent[slug] = { tickets: 0, guests: 0, revenue: 0, title: EVENT_TITLE[slug] ?? slug };
      byEvent[slug].guests += 1;
    }
    // Ensure every known event appears even if it has neither tickets nor guests
    for (const e of eventsList) {
      if (!byEvent[e.slug]) byEvent[e.slug] = { tickets: 0, guests: 0, revenue: 0, title: e.title };
    }

    // Rolling window: only the 6 most recent events by date — as new events
    // are added, older ones fall out automatically. Chronological order
    // (oldest → newest) so the bars read left-to-right like a timeline.
    // Only Party and Lounge events — Winery Visits are excluded from this chart.
    const ticketsByEvent = Object.entries(byEvent)
      .filter(([slug]) => ['wine_party', 'wine_lounge'].includes(EVENT_SECTION[slug]))
      .map(([slug, d]) => ({ slug, ...d, participants: d.tickets + d.guests, date: EVENT_DATE[slug] ?? '' }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date: _date, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars

    // ── Participants over time (tickets + list signups, last 12 weeks) ──────
    const weeks12 = lastWeeks(12, now);
    const ticketWeekCounts: Record<string, number> = {};
    for (const t of tickets) ticketWeekCounts[isoWeek(new Date(t.created_at))] = (ticketWeekCounts[isoWeek(new Date(t.created_at))] || 0) + 1;
    const guestWeekCounts: Record<string, number> = {};
    for (const g of guests) guestWeekCounts[isoWeek(new Date(g.created_at))] = (guestWeekCounts[isoWeek(new Date(g.created_at))] || 0) + 1;
    const participantsGrowth = weeks12.map((w) => ({
      week: w,
      label: weekLabel(w),
      tickets: ticketWeekCounts[w] || 0,
      guests: guestWeekCounts[w] || 0,
      total: (ticketWeekCounts[w] || 0) + (guestWeekCounts[w] || 0),
    }));

    // ── CRM customers — cumulative growth (last 12 weeks) ────────────────────
    const customers: { created_at: string }[] =
      customersRes.status === 'fulfilled' ? (customersRes.value.data ?? []) : [];
    const totalCustomers = customers.length;

    const customerWeekCounts: Record<string, number> = {};
    for (const c of customers) {
      const w = isoWeek(new Date(c.created_at));
      customerWeekCounts[w] = (customerWeekCounts[w] || 0) + 1;
    }
    let cumulativeCustomers = Math.max(0, totalCustomers - weeks12.reduce((s, w) => s + (customerWeekCounts[w] || 0), 0));
    const customerGrowth = weeks12.map((w) => {
      cumulativeCustomers += customerWeekCounts[w] || 0;
      return { week: w, label: weekLabel(w), new: customerWeekCounts[w] || 0, cumulative: cumulativeCustomers };
    });

    // ── Applications ──────────────────────────────────────────────────────────
    const applications: { id: string; status: string | null; created_at: string }[] =
      applicationsRes.status === 'fulfilled' ? (applicationsRes.value.data ?? []) : [];
    const totalApplications = applications.length;
    const approvedApplications = applications.filter((a) => a.status === 'approved').length;
    const approvalRate = totalApplications > 0 ? Math.round((approvedApplications / totalApplications) * 100) : 0;

    // ── Revenue — Stripe is the source of truth, auto-paginated ─────────────
    const months: string[] = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    let totalRevenue: number;
    let revenueByMonth: { month: string; label: string; revenue: number }[];

    if (filterSlug) {
      // When filtering by event: each ticket row = 1 ticket, revenue = count × price
      const price = EVENT_PRICE[filterSlug] ?? 0;
      totalRevenue = tickets.length * price;

      const monthRevenue: Record<string, number> = {};
      for (const t of tickets) {
        const m = t.created_at ? new Date(t.created_at).toISOString().slice(0, 7) : '';
        if (m) monthRevenue[m] = (monthRevenue[m] || 0) + price;
      }
      revenueByMonth = months.map((m) => ({
        month: m,
        label: new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        revenue: Math.round((monthRevenue[m] || 0) * 100) / 100,
      }));
    } else {
      // All events: use Stripe as source of truth for revenue. Auto-paginate —
      // a plain `.list({ limit: 100 })` silently truncates at 100 charges,
      // which was undercounting/zeroing older months in the window.
      const monthRevenue: Record<string, number> = {};
      totalRevenue = 0;
      try {
        for await (const charge of stripe.charges.list({
          limit: 100,
          created: { gte: revenueWindowStartUnix },
        })) {
          if (!charge.paid || charge.refunded) continue;
          const amount = charge.amount / 100;
          totalRevenue += amount;
          const m = new Date(charge.created * 1000).toISOString().slice(0, 7);
          monthRevenue[m] = (monthRevenue[m] || 0) + amount;
        }
      } catch (e) {
        console.error('[analytics] Stripe pagination error:', e);
      }
      revenueByMonth = months.map((m) => ({
        month: m,
        label: new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        revenue: Math.round((monthRevenue[m] || 0) * 100) / 100,
      }));
    }

    return NextResponse.json({
      events: eventsList,
      kpis: {
        totalTickets,
        totalGuests,
        totalParticipants: totalTickets + totalGuests,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCustomers,
        totalApplications,
        approvalRate,
      },
      selectedEventPrice: filterSlug ? (EVENT_PRICE[filterSlug] ?? null) : null,
      ticketsByEvent,
      revenueByMonth,
      participantsGrowth,
      customerGrowth,
    });
  } catch (err) {
    console.error('[analytics]', err);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
