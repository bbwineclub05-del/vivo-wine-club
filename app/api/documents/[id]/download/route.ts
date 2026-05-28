import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const BUCKET = 'documents';

/* ── GET /api/documents/[id]/download — streams PDF to client ── */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any;

  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select('file_path, file_name')
    .eq('id', id)
    .single();

  if (fetchErr || !doc) {
    return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(doc.file_path);

  if (dlErr || !blob) {
    return NextResponse.json({ error: 'Impossibile scaricare il file' }, { status: 500 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const safeName = doc.file_name.replace(/[^\w.\- ]/g, '_');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length':      String(buffer.byteLength),
    },
  });
}
