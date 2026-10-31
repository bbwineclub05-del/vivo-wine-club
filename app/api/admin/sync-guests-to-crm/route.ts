import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';

/**
 * POST /api/admin/sync-guests-to-crm
 * Retroactively syncs all event_guests entries into the customers table.
 * Safe to run multiple times (idempotent — skips already-counted events per customer).
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Load all event guests.
  // Paginato: senza, PostgREST si ferma a mille righe e il sync
  // lavorerebbe su una fetta della tabella credendola intera — con il
  // risultato che gli ospiti oltre la millesima non diventerebbero mai
  // clienti, e che i clienti oltre la millesima verrebbero riscritti
  // come se fossero nuovi.
  type GuestRow = { email: string; first_name: string; last_name: string; event_slug: string; created_at: string };

  let guests: GuestRow[];
  try {
    guests = await fetchAllRows<GuestRow>(db, (q) =>
      q
        .from('event_guests')
        .select('email, first_name, last_name, event_slug, created_at')
        .order('created_at', { ascending: true }),
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  // Group by email
  const byEmail = new Map<string, GuestRow[]>();
  for (const g of guests) {
    if (!g.email) continue;
    const list = byEmail.get(g.email) ?? [];
    list.push(g);
    byEmail.set(g.email, list);
  }

  // Load existing customers (email → row), anche qui per intero.
  type CustomerRow = { id: string; email: string; events: string[] | null; total_events: number; first_purchase_at: string; last_purchase_at: string };

  let existing: CustomerRow[];
  try {
    existing = await fetchAllRows<CustomerRow>(db, (q) =>
      q
        .from('customers')
        .select('id, email, events, total_events, first_purchase_at, last_purchase_at')
        .order('created_at', { ascending: true }),
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const customerMap = new Map<string, CustomerRow>();
  for (const c of existing) {
    customerMap.set(c.email, c);
  }

  let inserted = 0;
  let updated  = 0;

  for (const [email, guestRows] of byEmail.entries()) {
    const slugs   = [...new Set(guestRows.map(g => g.event_slug).filter(Boolean))];
    const name    = [guestRows[0].first_name, guestRows[0].last_name].filter(Boolean).join(' ');
    const dates   = guestRows.map(g => g.created_at).sort();
    const firstAt = dates[0];
    const lastAt  = dates[dates.length - 1];

    const existing = customerMap.get(email);
    if (existing) {
      const existingSlugs: string[] = existing.events ?? [];
      const newSlugs = slugs.filter(s => !existingSlugs.includes(s));
      if (newSlugs.length === 0) continue; // nothing to add
      const mergedSlugs = [...existingSlugs, ...newSlugs];
      await db.from('customers').update({
        name,
        last_purchase_at: lastAt > existing.last_purchase_at ? lastAt : existing.last_purchase_at,
        total_events:     mergedSlugs.length,
        events:           mergedSlugs,
      }).eq('id', existing.id);
      updated++;
    } else {
      await db.from('customers').insert({
        email,
        name,
        first_purchase_at: firstAt,
        last_purchase_at:  lastAt,
        total_events:      slugs.length,
        events:            slugs,
      });
      inserted++;
    }
  }

  return NextResponse.json({ ok: true, inserted, updated });
}
