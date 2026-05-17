import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/analytics/drain
 *
 * Vercel Analytics Drain endpoint.
 * Configure in Vercel Dashboard → Project → Settings → Drains → Add Drain
 *   Endpoint: https://vivowineclub.com/api/analytics/drain
 *   Secret:   value of VERCEL_DRAIN_SECRET env var
 *   Events:   Web Analytics
 *
 * Each request body is NDJSON (one JSON object per line).
 * We insert each event into the `site_analytics` Supabase table.
 */
export async function POST(req: NextRequest) {
  // ── Verify shared secret ──────────────────────────────────────────────────
  const secret = process.env.VERCEL_DRAIN_SECRET;
  if (secret) {
    const header = req.headers.get('x-vercel-signature') ?? req.headers.get('x-drain-secret') ?? '';
    if (header !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // NDJSON — one JSON object per line
  const lines = text.split('\n').filter(Boolean);
  if (lines.length === 0) return NextResponse.json({ ok: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      rows.push({
        occurred_at:  event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
        session_id:   event.sessionId   ?? event.session_id   ?? null,
        path:         event.path        ?? event.url          ?? null,
        country:      event.geo?.country ?? event.country     ?? null,
        city:         event.geo?.city    ?? event.city        ?? null,
        referrer:     event.referrer     ?? null,
        device_type:  event.device?.type ?? event.deviceType  ?? null,
      });
    } catch {
      // skip malformed lines
    }
  }

  if (rows.length === 0) return NextResponse.json({ ok: true });

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error } = await db.from('site_analytics').insert(rows);
  if (error) {
    console.error('[drain] Supabase insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[drain] Inserted ${rows.length} analytics event(s)`);
  return NextResponse.json({ ok: true, inserted: rows.length });
}
