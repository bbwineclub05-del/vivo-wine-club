import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, requireAdminOrStaff } from '@/lib/auth-guard';

/**
 * Chi vuole la bottiglia del mese.
 *
 * Non è un acquisto: è una mano alzata. Serve a decidere se costruire
 * davvero il secondo livello di tessera, invece di costruirlo e poi
 * scoprire che lo volevano in tre.
 */

const PREFERENZE = ['rosso', 'bianco', 'misto'] as const;

/* ── POST — alzo la mano, o cambio idea ── */
export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const preference = PREFERENZE.includes(body.preference) ? body.preference : 'misto';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const email = auth.email.trim().toLowerCase();

    const riga = {
      email,
      full_name: String(body.full_name ?? '').trim() || null,
      preference,
      note: String(body.note ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Non `upsert`: l'unicità è garantita da un indice su `lower(email)`,
    // e l'upsert pretende un vincolo sulla colonna così com'è. Si
    // guarda se la riga c'è e si sceglie, che è anche più leggibile.
    const { data: esistente } = await db
      .from('bottle_interest')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    const { data, error } = esistente
      ? await db.from('bottle_interest').update(riga).eq('id', esistente.id).select().single()
      : await db.from('bottle_interest').insert(riga).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ interest: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

/* ── DELETE — ci ho ripensato ── */
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { error } = await db
    .from('bottle_interest')
    .delete()
    .ilike('email', auth.email.trim().toLowerCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* ── GET — la mia riga, o tutte se sei del club ── */
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Al board e allo staff serve l'elenco per decidere; al socio basta
  // sapere se la mano l'ha già alzata.
  const admin = await requireAdminOrStaff(request);
  if (admin.ok && new URL(request.url).searchParams.get('all') === '1') {
    const { data, error } = await db
      .from('bottle_interest')
      .select('*')
      .order('created_at', { ascending: false });
    // Un errore qui va detto: una tabella che non risponde non deve
    // somigliare a "non si è iscritto nessuno".
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ interests: data ?? [] });
  }

  const { data } = await db
    .from('bottle_interest')
    .select('*')
    .ilike('email', auth.email.trim().toLowerCase())
    .maybeSingle();

  return NextResponse.json({ interest: data ?? null });
}
