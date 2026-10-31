import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';

/**
 * Come vanno le proposte di acquisto aggiuntivo.
 *
 * Due difetti, entrambi silenziosi. La lettura non era paginata e
 * PostgREST si ferma a mille righe: la tabella ne ha settemilaseicento,
 * quindi i numeri erano calcolati sul tredici per cento dei dati senza
 * che niente lo dicesse.
 *
 * E si contavano gli eventi `converted`, che nessuno scrive mai: chi
 * registra gli eventi manda `impression`, `added` e `removed`. La
 * colonna delle conversioni mostrava zero non perché nessuno comprasse,
 * ma perché contava una cosa inesistente. Qui si contano gli eventi
 * veri, e `added` meno `removed` dice quante proposte sono finite nel
 * carrello e ci sono rimaste.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const rows = await fetchAllRows<{ upsell_config_id: string | null; event_type: string }>(
      getSupabaseAdmin(),
      (q) =>
        q
          .from('upsell_analytics')
          .select('upsell_config_id, event_type')
          .order('created_at', { ascending: true }),
    );

    const map = new Map<string | null, { impressions: number; added: number; removed: number }>();
    for (const row of rows) {
      const key = row.upsell_config_id ?? null;
      if (!map.has(key)) map.set(key, { impressions: 0, added: 0, removed: 0 });
      const entry = map.get(key)!;
      if (row.event_type === 'impression') entry.impressions++;
      else if (row.event_type === 'added') entry.added++;
      else if (row.event_type === 'removed') entry.removed++;
    }

    const analytics = Array.from(map.entries()).map(([config_id, c]) => ({
      config_id,
      ...c,
      // Quelle aggiunte e non più tolte: è il numero che conta.
      kept: Math.max(c.added - c.removed, 0),
    }));

    return NextResponse.json({ analytics, totalEvents: rows.length });
  } catch (err) {
    console.error('[upsell/analytics]', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
