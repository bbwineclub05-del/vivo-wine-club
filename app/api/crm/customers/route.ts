import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows, type Person } from '@/lib/crm';

/**
 * GET /api/crm/customers — la rubrica, tutta, con il consenso.
 *
 * Due cose che prima mancavano.
 *
 * "Tutta": la select non aveva paginazione e PostgREST ne restituiva
 * mille fermandosi lì, in silenzio. Con 1413 clienti in tabella, 413
 * persone non comparivano da nessuna parte e filtrare per evento ne
 * mostrava la metà.
 *
 * "Con il consenso": il consenso marketing sta sulle righe di
 * `tickets` e `event_guests`, non su `customers`, quindi chi scriveva
 * una mail dal CRM non aveva modo di sapere chi l'avesse dato. Qui le
 * due fonti vengono unite per email: basta un sì da una qualsiasi
 * delle due perché la persona risulti consenziente.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const db = getSupabaseAdmin();

    const [customers, tickets, guests] = await Promise.all([
      fetchAllRows<Person>(db, (q) =>
        q
          .from('customers')
          .select('id, email, name, first_purchase_at, last_purchase_at, total_events, events')
          .order('last_purchase_at', { ascending: false, nullsFirst: false }),
      ),
      fetchAllRows<{ email: string | null; consent_marketing: boolean | null }>(db, (q) =>
        q.from('tickets').select('email, consent_marketing').order('created_at', { ascending: true }),
      ),
      fetchAllRows<{ email: string | null; consent_marketing: boolean | null }>(db, (q) =>
        q
          .from('event_guests')
          .select('email, consent_marketing')
          .order('created_at', { ascending: true }),
      ),
    ]);

    const consented = new Set<string>();
    for (const row of [...tickets, ...guests]) {
      if (row.consent_marketing === true && row.email) {
        consented.add(row.email.trim().toLowerCase());
      }
    }

    const withConsent = customers.map((c) => ({
      ...c,
      consent_marketing: consented.has((c.email ?? '').trim().toLowerCase()),
    }));

    return NextResponse.json({
      customers: withConsent,
      total: withConsent.length,
      consenting: withConsent.filter((c) => c.consent_marketing).length,
    });
  } catch (err) {
    console.error('[crm/customers] DB error:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
