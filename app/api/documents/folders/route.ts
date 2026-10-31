import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

/**
 * Le cartelle dei documenti.
 *
 * Chi può caricare un file può anche creare la cartella dove metterlo:
 * costringere a chiedere a un membro del board per fare un contenitore
 * vuoto produrrebbe soltanto file lasciati alla rinfusa.
 */

export const dynamic = 'force-dynamic';

/* ── GET — elenco con il numero di file ── */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const [foldersRes, docsRes] = await Promise.all([
    db.from('document_folders').select('*').order('name', { ascending: true }),
    db.from('documents').select('folder_id'),
  ]);

  if (foldersRes.error) {
    return NextResponse.json({ error: foldersRes.error.message }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of docsRes.data ?? []) {
    if (row.folder_id) counts[row.folder_id] = (counts[row.folder_id] ?? 0) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folders = (foldersRes.data ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    color: f.color ?? '#731515',
    created_at: f.created_at,
    count: counts[f.id] ?? 0,
  }));

  const loose = (docsRes.data ?? []).filter((r: { folder_id: string | null }) => !r.folder_id).length;

  return NextResponse.json({ folders, loose });
}

/* ── POST — nuova cartella ── */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const color = typeof body.color === 'string' ? body.color : '#731515';

    if (!name) {
      return NextResponse.json({ error: 'Serve un nome.' }, { status: 400 });
    }
    if (name.length > 60) {
      return NextResponse.json({ error: 'Il nome è troppo lungo (max 60 caratteri).' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('document_folders')
      .insert({ name, color })
      .select()
      .single();

    if (error) {
      // L'indice unico su lower(name) impedisce "Contratti" e "contratti".
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Esiste già una cartella con questo nome.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ folder: { ...data, count: 0 } });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
