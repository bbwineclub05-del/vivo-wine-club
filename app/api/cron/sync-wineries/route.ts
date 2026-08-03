import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { geocodeTiers } from '@/lib/geocode';

export const dynamic = 'force-dynamic';
// Geocoding (Nominatim, rate-limited to ~1 req/sec) can push a run with
// several pending wineries past the default serverless timeout.
export const maxDuration = 60;

/**
 * GET /api/cron/sync-wineries
 *
 * Scheduled daily (same time as the events cron).
 * Looks at all past winery_visit events (date < today) and creates an entry
 * in the `wineries` table for each one that doesn't already exist.
 * Completely idempotent — safe to run multiple times.
 *
 * Also callable manually from the admin area (no CRON_SECRET required when
 * called with Authorization: Bearer <admin-token>).
 */
export async function GET(request: Request) {
  // Accept either CRON_SECRET (Vercel cron) or admin Bearer token (manual trigger)
  const cronSecret  = process.env.CRON_SECRET;
  const authHeader  = request.headers.get('authorization');
  const cronHeader  = request.headers.get('x-cron-secret');
  const bearer      = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isCron      = cronSecret && (bearer === cronSecret || cronHeader === cronSecret);

  // If not cron, require a logged-in admin
  if (!isCron) {
    if (!bearer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = getSupabaseAdmin() as any;
    const { data: { user }, error: authErr } = await adminDb.auth.getUser(bearer);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    // Fetch all past winery_visit events
    const { data: events, error: evErr } = await db
      .from('events')
      .select('slug, title, date, section, location_full, location')
      .eq('section', 'winery_visit')
      .lt('date', today);

    if (evErr) {
      console.error('[sync-wineries] Events fetch error:', evErr.message);
      return NextResponse.json({ error: evErr.message }, { status: 500 });
    }

    const rows = (events ?? []) as { slug: string; title: string; date: string; location_full: string | null; location: string | null }[];
    if (rows.length === 0) {
      return NextResponse.json({ message: 'Nessun evento winery_visit passato trovato.', created: 0 });
    }

    // Upsert each as a winery entry (ignoreDuplicates = idempotent)
    const wineryRows = rows.map((e) => ({
      slug:       e.slug,
      name:       e.title,
      visit_date: e.date,
      event_slug: e.slug,
    }));

    const { error: upsertErr } = await db
      .from('wineries')
      .upsert(wineryRows, { onConflict: 'slug', ignoreDuplicates: true });

    if (upsertErr) {
      console.error('[sync-wineries] Upsert error:', upsertErr.message);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    console.log(`[sync-wineries] Synced ${rows.length} winery entries:`, rows.map((e) => e.slug));

    // Best-effort geocoding for any of these wineries still missing coordinates
    // (newly created rows, or rows a previous run failed to place). Self-healing
    // and idempotent — never touches rows that already have lat/lng.
    const { data: needsGeocode } = await db
      .from('wineries')
      .select('slug')
      .in('slug', rows.map((e) => e.slug))
      .is('lat', null);

    const geocoded: string[] = [];
    for (const w of (needsGeocode ?? []) as { slug: string }[]) {
      const ev = rows.find((e) => e.slug === w.slug);
      if (!ev) continue;
      const cleanedVenue = (ev.location_full ?? '').replace(/[-—]\s*ore\s*\d{1,2}[:.]\d{2}\s*$/i, '').trim();
      const tiers = [
        ...(cleanedVenue ? [{ q: cleanedVenue, precise: true }] : []),
        ...(ev.location ? [{ q: ev.location, precise: false }] : []),
      ];
      if (tiers.length === 0) continue;
      const result = await geocodeTiers(tiers, 'Italy'); // all Vivo Wine Club visits are in Italy
      if (result) {
        await db.from('wineries').update({ lat: result.lat, lng: result.lng, coords_precise: result.precise }).eq('slug', w.slug);
        geocoded.push(w.slug);
      }
      // Nominatim usage policy: max 1 request/sec
      await new Promise((r) => setTimeout(r, 1100));
    }

    return NextResponse.json({
      message: `${rows.length} cantina${rows.length === 1 ? '' : 'e'} sincronizzata${rows.length === 1 ? '' : 'e'}.`,
      created: rows.length,
      wineries: rows.map((e) => ({ slug: e.slug, name: e.title })),
      geocoded,
    });
  } catch (err) {
    console.error('[sync-wineries] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
