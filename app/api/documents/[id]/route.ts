import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

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
