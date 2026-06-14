import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const BUCKET = 'documents';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/* ── GET /api/documents — list all ── */
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

/* ── POST /api/documents — upload ── */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;

    // Ensure private bucket exists
    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {/* already exists */});

    const formData   = await request.formData();
    const file       = formData.get('file')        as File   | null;
    const title      = formData.get('title')       as string | null;
    const description = formData.get('description') as string | null;
    const category   = formData.get('category')    as string | null;

    if (!file || !title?.trim()) {
      return NextResponse.json({ error: 'file e titolo sono obbligatori' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Formato non supportato. Usa PDF, Word o PowerPoint.' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File troppo grande (max 20 MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data, error: dbErr } = await supabase
      .from('documents')
      .insert({
        title:       title.trim(),
        description: description?.trim() || null,
        category:    category || 'Altro',
        file_path:   storagePath,
        file_name:   file.name,
        file_size:   file.size,
        uploaded_by: auth.email,
      })
      .select()
      .single();

    if (dbErr) {
      // Roll back the storage upload on DB failure
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error('[documents POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
