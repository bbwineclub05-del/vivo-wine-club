import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

export async function GET() {
  try {
    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const sixMonthsAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 180;

    // Build event price/title lookup from DB
    const EVENT_PRICE: Record<string, number> = {};
    const EVENT_TITLE: Record<string, string> = {};
    try {
      const { data: eventsData } = await db.from('events').select('slug, title, price');
      for (const e of (eventsData ?? [])) {
        EVENT_PRICE[e.slug] = e.price ?? 0;
        EVENT_TITLE[e.slug] = e.title ?? e.slug;
      }
    } catch {/* non-fatal */}

    // ── Parallel fetches ──────────────────────────────────────────────────────
    const [
      ticketsRes,
      subscribersRes,
      applicationsRes,
      stripeCharges,
    ] = await Promise.allSettled([
      db.from('tickets').select('event_id, ticket_count, buyer_name, created_at').order('created_at', { ascending: false }),
      db.from('subscribers').select('created_at').order('created_at', { ascending: true }),
      db.from('applications').select('id, created_at'),
      stripe.charges.list({ limit: 100, created: { gte: sixMonthsAgo } }),
    ]);

    // ── Tickets ───────────────────────────────────────────────────────────────
    const tickets: { event_id: string; ticket_count: number; buyer_name: string; created_at: string }[] =
      ticketsRes.status === 'fulfilled' ? (ticketsRes.value.data ?? []) : [];

    const totalTickets = tickets.reduce((s, t) => s + (t.ticket_count ?? 1), 0);

    // Group by event
    const byEvent: Record<string, { tickets: number; revenue: number; title: string }> = {};
    for (const t of tickets) {
      const slug  = t.event_id;
      const price = EVENT_PRICE[slug] ?? 0;
      const qty   = t.ticket_count ?? 1;
      if (!byEvent[slug]) {
        byEvent[slug] = { tickets: 0, revenue: 0, title: EVENT_TITLE[slug] ?? slug };
      }
      byEvent[slug].tickets  += qty;
      byEvent[slug].revenue  += price * qty;
    }

    const ticketsByEvent = Object.entries(byEvent)
      .map(([slug, d]) => ({ slug, ...d }))
      .sort((a, b) => b.tickets - a.tickets);

    // Recent ticket activity (last 5)
    const recentTickets = tickets.slice(0, 5).map((t) => ({
      buyer: t.buyer_name,
      event: EVENT_TITLE[t.event_id] ?? t.event_id,
      tickets: t.ticket_count ?? 1,
      date: t.created_at,
    }));

    // ── Subscribers ───────────────────────────────────────────────────────────
    const subscribers: { created_at: string }[] =
      subscribersRes.status === 'fulfilled' ? (subscribersRes.value.data ?? []) : [];

    const totalSubscribers = subscribers.length;

    // Build weekly cumulative (last 12 weeks)
    const weekCounts: Record<string, number> = {};
    for (const s of subscribers) {
      const w = isoWeek(new Date(s.created_at));
      weekCounts[w] = (weekCounts[w] || 0) + 1;
    }

    // Last 12 weeks
    const weeks: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 86400000);
      weeks.push(isoWeek(d));
    }

    let cumulative = Math.max(0, totalSubscribers - weeks.reduce((s, w) => s + (weekCounts[w] || 0), 0));
    const subscriberGrowth = weeks.map((w) => {
      cumulative += weekCounts[w] || 0;
      return { week: w, label: weekLabel(w), new: weekCounts[w] || 0, cumulative };
    });

    // ── Applications ──────────────────────────────────────────────────────────
    const applications: { id: string; created_at: string }[] =
      applicationsRes.status === 'fulfilled' ? (applicationsRes.value.data ?? []) : [];

    const totalApplications = applications.length;
    const conversionRate = totalApplications > 0
      ? Math.round((totalSubscribers / Math.max(totalApplications, totalSubscribers)) * 100)
      : 0;

    // ── Stripe Revenue ────────────────────────────────────────────────────────
    const charges =
      stripeCharges.status === 'fulfilled'
        ? stripeCharges.value.data.filter((c) => c.paid && !c.refunded)
        : [];

    const totalRevenue = charges.reduce((s, c) => s + c.amount, 0) / 100;

    // Group by month (last 6)
    const monthRevenue: Record<string, number> = {};
    for (const c of charges) {
      const m = new Date(c.created * 1000).toISOString().slice(0, 7); // "2026-03"
      monthRevenue[m] = (monthRevenue[m] || 0) + c.amount / 100;
    }

    // Build last 6 months array
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const revenueByMonth = months.map((m) => ({
      month: m,
      label: new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      revenue: Math.round((monthRevenue[m] || 0) * 100) / 100,
    }));

    return NextResponse.json({
      kpis: {
        totalTickets,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSubscribers,
        totalApplications,
        conversionRate,
      },
      ticketsByEvent,
      revenueByMonth,
      subscriberGrowth,
      recentTickets,
    });
  } catch (err) {
    console.error('[analytics]', err);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
