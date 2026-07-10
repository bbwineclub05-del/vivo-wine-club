import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

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

  // Load all event guests
  const { data: guests, error: gErr } = await db
    .from('event_guests')
    .select('email, first_name, last_name, event_slug, created_at')
    .order('created_at', { ascending: true });

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  // Group by email
  type GuestRow = { email: string; first_name: string; last_name: string; event_slug: string; created_at: string };
  const byEmail = new Map<string, GuestRow[]>();
  for (const g of (guests as GuestRow[]) ?? []) {
    if (!g.email) continue;
    const list = byEmail.get(g.email) ?? [];
    list.push(g);
    byEmail.set(g.email, list);
  }

  // Load existing customers (email → row)
  const { data: existing, error: cErr } = await db
    .from('customers')
    .select('id, email, events, total_events, first_purchase_at, last_purchase_at');

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  type CustomerRow = { id: string; email: string; events: string[] | null; total_events: number; first_purchase_at: string; last_purchase_at: string };
  const customerMap = new Map<string, CustomerRow>();
  for (const c of (existing as CustomerRow[]) ?? []) {
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
