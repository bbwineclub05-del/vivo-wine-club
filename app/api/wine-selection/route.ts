import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, requireAdminOrStaff } from '@/lib/auth-guard';

/**
 * Le bottiglie della VIVO Selection.
 *
 * In lettura serve un accesso: è un vantaggio della tessera, e una
 * lista pubblica non sarebbe più un vantaggio. In scrittura serve
 * essere del club.
 */

const CAMPI = [
  'name', 'producer', 'winery_slug', 'vintage', 'region', 'grape',
  'price_cents', 'where_to_buy', 'photo_url',
  'note_it', 'note_en', 'note_fr', 'sort_order', 'published',
] as const;

function ripulisci(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of CAMPI) {
    if (!(k in body)) continue;
    const v = body[k];
    if (k === 'price_cents') out[k] = v === null || v === '' ? null : Number(v);
    else if (k === 'sort_order') out[k] = Number(v) || 0;
    else if (k === 'published') out[k] = v !== false;
    else out[k] = typeof v === 'string' ? v.trim() || null : (v ?? null);
  }
  return out;
}

/* ── GET — l'elenco. I soci vedono solo le pubblicate. ── */
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const admin = await requireAdminOrStaff(request);

  let q = db.from('wine_selection').select('*').order('sort_order').order('created_at', { ascending: false });
  if (!admin.ok) q = q.eq('published', true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wines: data ?? [] });
}

/* ── POST — una bottiglia nuova ── */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const patch = ripulisci(body);
    if (!patch.name) return NextResponse.json({ error: 'Serve il nome del vino.' }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db.from('wine_selection').insert(patch).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ wine: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

/* ── PATCH — modifica ── */
export async function PATCH(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Manca la bottiglia.' }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('wine_selection')
      .update({ ...ripulisci(body), updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ wine: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

/* ── DELETE ── */
export async function DELETE(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Manca la bottiglia.' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { error } = await db.from('wine_selection').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
