import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wineries — public, returns all DB wineries ordered by visit date desc.
 *
 * Le cantine con `hidden = true` restano fuori. La mappa dell'area
 * riservata chiede `?includeHidden=1` per vederle comunque, segnate
 * come nascoste. Se la colonna non c'è ancora (migrazione non
 * eseguita) l'elenco esce intero, come prima.
 */
export async function GET(request: Request) {
  try {
    const includeHidden = new URL(request.url).searchParams.get('includeHidden') === '1';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const all = () =>
      db.from('wineries').select('*').order('visit_date', { ascending: false, nullsFirst: false });

    let { data, error } = includeHidden ? await all() : await all().eq('hidden', false);
    if (error && !includeHidden && isMissingHiddenColumn(error)) {
      ({ data, error } = await all());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ wineries: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/** Postgres risponde 42703 quando una colonna non esiste. */
function isMissingHiddenColumn(error: { code?: string; message?: string }) {
  return error.code === '42703' || /hidden/i.test(error.message ?? '');
}
