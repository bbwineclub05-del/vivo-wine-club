import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, requireAdminOrStaff } from '@/lib/auth-guard';

const BUCKET = 'documents';

/* ── DELETE /api/documents/[id] — admin only ── */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any;

  // Fetch to get the storage path
  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', id)
    .single();

  if (fetchErr || !doc) {
    return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
  }

  // Remove from Storage (non-fatal if already gone)
  await supabase.storage.from(BUCKET).remove([doc.file_path]);

  // Remove DB row
  const { error: dbErr } = await supabase.from('documents').delete().eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/documents/[id] — rinomina, descrizione, spostamento.
 *
 * Spostare un file in un'altra cartella non distrugge niente e serve
 * ogni giorno, quindi basta essere staff: l'eliminazione, che invece è
 * definitiva, resta al board.
 */
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

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return NextResponse.json({ error: 'Serve un titolo.' }, { status: 400 });
      patch.title = title;
    }
    if (body.description !== undefined) {
      patch.description = String(body.description).trim() || null;
    }
    if (body.folder_id !== undefined) {
      patch.folder_id = body.folder_id || null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Niente da aggiornare.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('documents')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
