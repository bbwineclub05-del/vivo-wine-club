import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { MAX_FILE_BYTES, isBlocked, extensionOf, storageSafeName } from '@/lib/documents';

const BUCKET = 'documents';

/* ── GET /api/documents — elenco ── */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

/**
 * POST /api/documents — registra un documento.
 *
 * Accetta due forme, e non per capriccio:
 *
 *  · JSON con `file_path`, quando il file è già stato caricato nello
 *    storage con la URL firmata di /api/documents/upload-url. È la via
 *    normale, l'unica che regge i file grandi una volta pubblicato.
 *
 *  · multipart con `file`, la via vecchia. Resta perché funziona e
 *    perché toglierla romperebbe qualsiasi cosa la stia ancora usando,
 *    ma è limitata da quanto il server accetta nel corpo.
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any;
  const contentType = request.headers.get('content-type') ?? '';

  try {
    /* ── Via nuova: il file è già nello storage ── */
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const title = String(body.title ?? '').trim();
      const filePath = String(body.file_path ?? '').trim();
      const fileName = String(body.file_name ?? '').trim();
      const fileSize = Number(body.file_size ?? 0);

      if (!title || !filePath || !fileName) {
        return NextResponse.json(
          { error: 'title, file_path e file_name sono obbligatori' },
          { status: 400 },
        );
      }
      if (isBlocked(fileName)) {
        return NextResponse.json(
          { error: `I file .${extensionOf(fileName)} non si possono caricare.` },
          { status: 400 },
        );
      }

      // Il file deve esistere davvero: senza questo controllo si
      // potrebbe creare una riga che punta nel vuoto.
      const { error: missing } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 60);
      if (missing) {
        return NextResponse.json({ error: 'Il file non risulta caricato.' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title,
          description: String(body.description ?? '').trim() || null,
          category: body.category ?? 'Altro',
          folder_id: body.folder_id || null,
          file_path: filePath,
          file_name: fileName,
          file_size: Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
          uploaded_by: auth.email,
        })
        .select()
        .single();

      if (error) {
        await supabase.storage.from(BUCKET).remove([filePath]);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ document: data });
    }

    /* ── Via vecchia: il file arriva nel corpo della richiesta ── */
    await supabase.storage
      .createBucket(BUCKET, { public: false })
      .catch(() => {/* esiste già */});

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;
    const folderId = formData.get('folder_id') as string | null;

    if (!file || !title?.trim()) {
      return NextResponse.json({ error: 'file e titolo sono obbligatori' }, { status: 400 });
    }
    if (isBlocked(file.name)) {
      return NextResponse.json(
        { error: `I file .${extensionOf(file.name)} sono programmi e non si possono caricare.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File troppo grande (max 50 MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${storageSafeName(file.name)}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data, error: dbErr } = await supabase
      .from('documents')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'Altro',
        folder_id: folderId || null,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: auth.email,
      })
      .select()
      .single();

    if (dbErr) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error('[documents POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
