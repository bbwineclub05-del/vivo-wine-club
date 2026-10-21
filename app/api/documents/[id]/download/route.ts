import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { mimeOf, canOpenInline } from '@/lib/documents';

const BUCKET = 'documents';

/**
 * GET /api/documents/[id]/download — restituisce il file.
 *
 * Con `?inline=1` il browser lo apre in una scheda invece di scaricarlo,
 * ma soltanto per i tipi che sa mostrare senza rischi: PDF e immagini
 * raster. Tutto il resto scende come allegato, SVG compreso — un SVG
 * può contenere script, e aprirlo sul nostro dominio li eseguirebbe lì
 * dentro, con la sessione di chi ha fatto clic.
 *
 * Il tipo è dedotto dall'estensione e non da quello che il browser
 * aveva dichiarato al caricamento, perché quel valore arriva dal
 * client. `nosniff` chiude la porta rimasta: senza, un browser può
 * decidere da sé che un file è HTML e trattarlo come tale.
 */
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

  const wantsInline = new URL(request.url).searchParams.get('inline') === '1';
  const inline = wantsInline && canOpenInline(doc.file_name);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeOf(doc.file_name),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
      'Content-Length': String(buffer.byteLength),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
