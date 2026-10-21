import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

/**
 * GET /api/crm/categories — le liste, con quanto si perde a cancellarle.
 *
 * Cancellare una lista porta via i suoi contatti, ma quasi tutti sono
 * anche in Persone: quelli nati da un biglietto ci sono di sicuro.
 * L'avviso generico "eliminerai anche i contatti" è quindi quasi
 * sempre falso allarme, e un avviso che grida sempre al lupo non viene
 * più letto. Qui ogni lista porta con sé `onlyHere`: quanti dei suoi
 * contatti sparirebbero davvero.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const [catRes, contactRes, custRes] = await Promise.all([
    db()
      .from('crm_custom_categories')
      .select('id, name, created_at')
      .order('created_at', { ascending: true }),
    fetchAllRows<{ category_id: string; email: string | null }>(db(), (q) =>
      q.from('crm_custom_contacts').select('category_id, email').order('created_at', { ascending: true }),
    ).catch(() => []),
    fetchAllRows<{ email: string | null }>(db(), (q) =>
      q.from('customers').select('email').order('created_at', { ascending: true }),
    ).catch(() => []),
  ]);

  if (catRes.error) return NextResponse.json({ error: catRes.error.message }, { status: 500 });

  const known = new Set(
    (custRes as { email: string | null }[]).map((c) => (c.email ?? '').trim().toLowerCase()),
  );

  const stats: Record<string, { contacts: number; onlyHere: number }> = {};
  for (const c of contactRes as { category_id: string; email: string | null }[]) {
    const s = (stats[c.category_id] ??= { contacts: 0, onlyHere: 0 });
    s.contacts += 1;
    const email = (c.email ?? '').trim().toLowerCase();
    // Senza email non può stare in Persone: esiste solo qui.
    if (!email || !known.has(email)) s.onlyHere += 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = (catRes.data ?? []).map((c: any) => ({
    ...c,
    contacts: stats[c.id]?.contacts ?? 0,
    onlyHere: stats[c.id]?.onlyHere ?? 0,
  }));

  return NextResponse.json({ categories });
}

/** POST /api/crm/categories — create a new category */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const { data, error } = await db()
    .from('crm_custom_categories')
    .insert({ name })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data }, { status: 201 });
}
