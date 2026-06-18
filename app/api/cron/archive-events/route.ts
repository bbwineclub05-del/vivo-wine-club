import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Security: verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-cron-secret');
    const bearer     = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (bearer !== cronSecret && cronHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;

    // Find events with date < today that are not yet archived
    const { data: toArchive, error: fetchError } = await supabase
      .from('events')
      .select('id, slug, title, date')
      .lt('date', today)
      .eq('archived', false);

    if (fetchError) {
      console.error('[archive-events] Fetch error:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const events = toArchive ?? [];

    if (events.length === 0) {
      return NextResponse.json({ message: 'Nessun evento da archiviare.', archived: 0 });
    }

    const ids = events.map((e: { id: string }) => e.id);

    const { error: updateError } = await supabase
      .from('events')
      .update({ archived: true })
      .in('id', ids);

    if (updateError) {
      console.error('[archive-events] Update error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[archive-events] Archived ${events.length} events:`, events.map((e: { slug: string }) => e.slug));

    return NextResponse.json({
      message: `${events.length} event${events.length === 1 ? 'o archiviato' : 'i archiviati'} con successo.`,
      archived: events.length,
      events: events.map((e: { slug: string; title: string; date: string }) => ({ slug: e.slug, title: e.title, date: e.date })),
    });
  } catch (err) {
    console.error('[archive-events] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
