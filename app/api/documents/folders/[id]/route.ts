import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, requireAdminOrStaff } from '@/lib/auth-guard';

/* ── PATCH — rinomina o cambia colore ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'Serve un nome.' }, { status: 400 });
      if (name.length > 60) {
        return NextResponse.json({ error: 'Il nome è troppo lungo (max 60 caratteri).' }, { status: 400 });
      }
      patch.name = name;
    }
    if (body.color !== undefined) patch.color = String(body.color);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Niente da aggiornare.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('document_folders')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Esiste già una cartella con questo nome.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ folder: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

/**
 * DELETE — elimina la cartella, non i file.
 *
 * La foreign key è `on delete set null`: i documenti che erano dentro
 * restano in archivio e tornano fuori da ogni cartella. Riservata al
 * board, come l'eliminazione dei singoli documenti.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Si dice a chi chiama quanti file sono stati spostati fuori, così
  // l'interfaccia può dirlo a sua volta invece di far sparire le cose
  // in silenzio.
  const { count } = await db
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('folder_id', id);

  const { error } = await db.from('document_folders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, released: count ?? 0 });
}
