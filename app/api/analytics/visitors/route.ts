import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { requireAdmin } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

const PROPERTY_ID = '538468146';

function getClient() {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const privateKey   = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Analytics service account credentials not configured');
  }

  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

/** Run a single-value activeUsers report for a GA date-range string (e.g. "today", "7daysAgo"). */
async function fetchTotal(
  client: BetaAnalyticsDataClient,
  startDate: string,
  endDate = 'today',
): Promise<number> {
  const [res] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: 'activeUsers' }],
  });
  const value = res.rows?.[0]?.metricValues?.[0]?.value;
  return value ? parseInt(value, 10) : 0;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const client = getClient();

    // Run all three scalar queries + daily breakdown in parallel
    const [todayVisitors, last7Visitors, last30Visitors, dailyRes] = await Promise.all([
      fetchTotal(client, 'today', 'today'),
      fetchTotal(client, '7daysAgo', 'today'),
      fetchTotal(client, '30daysAgo', 'today'),
      // Daily breakdown for the last 28 days to build weekly chart
      client.runReport({
        property: `properties/${PROPERTY_ID}`,
        dateRanges: [{ startDate: '27daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),
    ]);

    // ── Build weekly chart (4 complete weeks, Mon→Sun, newest last) ──────────
    // Group GA daily rows (format YYYYMMDD) into ISO weeks
    const dayMap: Record<string, number> = {};
    for (const row of (dailyRes[0].rows ?? [])) {
      const raw  = row.dimensionValues?.[0]?.value ?? ''; // e.g. "20260519"
      const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      dayMap[date] = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
    }

    // Build 4-week buckets ending today
    const today = new Date();
    // Snap to start of current week (Monday)
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=Mon
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dow);

    const weeklyChart: { label: string; visitors: number }[] = [];

    for (let w = 3; w >= 0; w--) {
      const start = new Date(weekStart);
      start.setDate(weekStart.getDate() - w * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      let visitors = 0;
      for (let d = 0; d <= 6; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + d);
        const key = day.toISOString().slice(0, 10);
        visitors += dayMap[key] ?? 0;
      }

      const label = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      weeklyChart.push({ label, visitors });
    }

    return NextResponse.json({
      todayVisitors,
      last7daysVisitors: last7Visitors,
      last30daysVisitors: last30Visitors,
      weeklyChart,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
