import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';

/**
 * GET /api/events/guest-counts
 *
 * Gli eventi passati con quante persone distinte ci sono state.
 *
 * "Distinte" è la parola che prima non era vera. Il conteggio costruiva
 * un insieme di email per evento, ma dagli ospiti leggeva solo lo slug
 * e ci infilava chiavi inventate — `_row_0`, `_row_1` — che per
 * definizione non si ripetono mai: contava righe fingendo di contare
 * persone. Chi si era iscritto e aveva anche comprato un biglietto
 * veniva contato due volte. E la lettura si fermava comunque a mille
 * righe su 1184 ospiti.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  try {
    const [guests, tickets] = await Promise.all([
      fetchAllRows<{ event_slug: string | null; email: string | null }>(db, (q) =>
        q
          .from('event_guests')
          .select('event_slug, email')
          .order('created_at', { ascending: true }),
      ),
      fetchAllRows<{ event_id: string | null; email: string | null }>(db, (q) =>
        q
          .from('tickets')
          .select('event_id, email')
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: true }),
      ),
    ]);

    const emailsBySlug: Record<string, Set<string>> = {};
    const add = (slug: string | null, email: string | null, i: number) => {
      if (!slug) return;
      const set = (emailsBySlug[slug] ??= new Set());
      const clean = (email ?? '').trim().toLowerCase();
      // Senza email non si può sapere se è una persona già vista: la si
      // conta una volta sola con una chiave sua, invece di scartarla.
      set.add(clean || `#senza-email-${slug}-${i}`);
    };

    guests.forEach((g, i) => add(g.event_slug, g.email, i));
    tickets.forEach((t, i) => add(t.event_id, t.email, i));

    const slugs = Object.keys(emailsBySlug);
    if (slugs.length === 0) return NextResponse.json({ events: [] });

    const { data: eventsData, error } = await db
      .from('events')
      .select('slug, title, date')
      .in('slug', slugs)
      .order('date', { ascending: false });

    if (error) {
      console.error('[guest-counts] events fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const events = ((eventsData ?? []) as { slug: string; title: string; date: string }[])
      .map((e) => ({
        slug: e.slug,
        title: e.title,
        date: e.date,
        count: emailsBySlug[e.slug]?.size ?? 0,
      }))
      .filter((e) => e.count > 0);

    return NextResponse.json({ events });
  } catch (err) {
    console.error('[guest-counts]', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
