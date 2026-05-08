import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { EVENTS } from '@/lib/events';

/** GET /api/events/all — all events including unpublished, for admin panel */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      return NextResponse.json({ events: data, source: 'db' });
    }
    console.error('[events/all] DB error:', error?.message);
  } catch (err) {
    console.error('[events/all]', err);
  }

  // Static fallback
  return NextResponse.json({ events: EVENTS, source: 'static' });
}
