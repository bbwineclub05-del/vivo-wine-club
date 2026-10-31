import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';

/**
 * Le richieste di iscrizione ricevute prima del nuovo sistema.
 *
 * Restano in `applications` esattamente come sono: sono la storia di
 * quando le iscrizioni si valutavano una per una. Qui si leggono
 * sapendo, per ciascuna, se quella persona ha già una tessera — che è
 * l'unica cosa che serve per decidere cosa farne.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const db = getSupabaseAdmin();

    const [applications, memberships] = await Promise.all([
      fetchAllRows<{
        id: string;
        name: string;
        email: string;
        city: string | null;
        status: string;
        created_at: string;
      }>(db, (q) =>
        q
          .from('applications')
          .select('id, name, email, phone, city, status, source, created_at')
          .order('created_at', { ascending: false }),
      ),
      fetchAllRows<{ email: string; member_id: string | null }>(db, (q) =>
        q.from('memberships').select('email, member_id').order('created_at', { ascending: true }),
      ),
    ]);

    const byEmail = new Map(
      memberships.map((m) => [(m.email ?? '').trim().toLowerCase(), m.member_id]),
    );

    return NextResponse.json({
      applications: applications.map((a) => ({
        ...a,
        member_id: byEmail.get((a.email ?? '').trim().toLowerCase()) ?? null,
      })),
    });
  } catch (err) {
    console.error('[memberships/archive]', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
