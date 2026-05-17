import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

/**
 * GET /api/analytics/visitors
 *
 * Returns visitor stats aggregated from the `site_analytics` table
 * (populated by the Vercel Analytics Drain at /api/analytics/drain).
 *
 * Response:
 *   {
 *     totalVisitors:     number,   // unique session_ids all time
 *     lastMonthVisitors: number,   // unique session_ids in last 30 days
 *     weeklyChart: [              // last 8 ISO weeks
 *       { week: "2026-W18", label: "May 4", visitors: 42 },
 *       ...
 *     ],
 *     hasData: boolean            // false when table is empty / drain not yet set up
 *   }
 */

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekLabel(iso: string): string {
  const [year, w] = iso.split('-W');
  const d = new Date(Date.UTC(Number(year), 0, 1));
  d.setUTCDate(d.getUTCDate() + (Number(w) - 1) * 7 - (d.getUTCDay() || 7) + 1);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // ── 1. Total unique visitors (all time) ─────────────────────────────────
  const { data: allRows, error: allErr } = await db
    .from('site_analytics')
    .select('session_id')
    .not('session_id', 'is', null);

  if (allErr) return NextResponse.json({ error: allErr.message }, { status: 500 });

  const totalVisitors = new Set((allRows ?? []).map((r: { session_id: string }) => r.session_id)).size;
  const hasData = (allRows ?? []).length > 0;

  // ── 2. Last 30 days unique visitors ─────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: monthRows } = await db
    .from('site_analytics')
    .select('session_id')
    .not('session_id', 'is', null)
    .gte('occurred_at', thirtyDaysAgo.toISOString());

  const lastMonthVisitors = new Set((monthRows ?? []).map((r: { session_id: string }) => r.session_id)).size;

  // ── 3. Weekly chart — last 8 weeks ──────────────────────────────────────
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: weekRows } = await db
    .from('site_analytics')
    .select('session_id, occurred_at')
    .not('session_id', 'is', null)
    .gte('occurred_at', eightWeeksAgo.toISOString());

  // Build last-8-weeks skeleton
  const weeks: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weeks.push(isoWeek(d));
  }
  // Deduplicate while preserving order
  const uniqueWeeks = [...new Set(weeks)];

  // Count unique session_ids per week
  const weekMap: Record<string, Set<string>> = {};
  for (const w of uniqueWeeks) weekMap[w] = new Set();

  for (const row of (weekRows ?? [])) {
    const w = isoWeek(new Date(row.occurred_at));
    if (weekMap[w]) weekMap[w].add(row.session_id);
  }

  const weeklyChart = uniqueWeeks.map((w) => ({
    week:     w,
    label:    weekLabel(w),
    visitors: weekMap[w].size,
  }));

  return NextResponse.json({
    totalVisitors,
    lastMonthVisitors,
    weeklyChart,
    hasData,
  });
}
