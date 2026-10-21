import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

/**
 * Gli sponsor erano l'unica rubrica senza rotte di scrittura: il
 * componente inseriva ed eliminava dal browser, con la chiave pubblica,
 * appoggiandosi alle policy della tabella. Ora passa di qui come le
 * altre tre, con il controllo di chi sei fatto dal lato che non si può
 * modificare dagli strumenti per sviluppatori.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { data, error } = await db()
    .from('sponsors')
    .select('*')
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sponsors: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Serve un nome.' }, { status: 400 });

    const { data, error } = await db()
      .from('sponsors')
      .insert({
        name,
        email: body.email || null,
        phone: body.phone || null,
        city: body.city || null,
        website: body.website || null,
        notes: body.notes || null,
        stage: body.stage || 'new',
        owner_email: body.owner_email || null,
        next_action_at: body.next_action_at || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sponsor: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
