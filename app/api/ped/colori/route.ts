import { NextResponse } from 'next/server';

import { requireAdminOrStaff } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * I colori dei formati del piano editoriale.
 *
 * Stanno in `settings`, la tabella a chiave e valore che c'era gia',
 * e non in una tabella nuova: e' una riga sola di testo, e una
 * tabella per una riga e' una tabella che fra un anno nessuno sa
 * perche' esiste.
 *
 * Sono di tutti, non di chi li ha scelti. Un piano editoriale lo
 * guardano in cinque, e cinque legende diverse sullo stesso
 * calendario sono peggio di una legenda brutta: uno direbbe "il reel
 * verde" e un altro cercherebbe un reel rosso.
 */

export const dynamic = 'force-dynamic';

const CHIAVE = 'ped_colori_formato';
const COLORE = /^#[0-9a-fA-F]{6}$/;

export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data } = await db.from('settings').select('value').eq('key', CHIAVE).maybeSingle();

  try {
    return NextResponse.json({ colori: data?.value ? JSON.parse(data.value) : {} });
  } catch {
    // Un valore illeggibile non deve rompere la pagina: si riparte
    // dai colori di partenza, che sono scritti nel codice.
    return NextResponse.json({ colori: {} });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const { colori } = (await request.json()) as { colori?: Record<string, string> };

    /* Si tiene solo quello che e' davvero un colore. Un valore
       arbitrario qui dentro finirebbe dritto in uno `style`, e una
       stringa scritta da qualcuno in un attributo di stile non e'
       una cosa che si lascia passare per comodita'. */
    const pulito: Record<string, string> = {};
    for (const [k, v] of Object.entries(colori ?? {})) {
      if (typeof v === 'string' && COLORE.test(v)) pulito[k.slice(0, 40)] = v.toLowerCase();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { error } = await db
      .from('settings')
      .upsert({ key: CHIAVE, value: JSON.stringify(pulito), updated_at: new Date().toISOString() },
        { onConflict: 'key' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ colori: pulito });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
