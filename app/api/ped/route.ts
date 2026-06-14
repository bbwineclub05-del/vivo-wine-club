import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const BUCKET = 'ped-media';

/* ── GET /api/ped — list all entries ── */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('ped_entries')
    .select('*')
    .order('date',       { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

/* ── POST /api/ped — create new entry (multipart/form-data) ── */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;

    const fd           = await request.formData();
    const date         = fd.get('date')         as string | null;
    const title        = fd.get('title')        as string | null;
    const description  = fd.get('description')  as string | null;
    const platform     = fd.get('platform')     as string | null;
    const content_type = fd.get('content_type') as string | null;
    const status       = (fd.get('status')      as string | null) ?? 'planned';
    const assigned_to  = fd.get('assigned_to')  as string | null;
    const notes        = fd.get('notes')        as string | null;
    const file         = fd.get('file')         as File   | null;

    if (!date || !title?.trim() || !platform || !content_type) {
      return NextResponse.json({ error: 'date, title, platform e content_type sono obbligatori' }, { status: 400 });
    }

    let media_url: string | null  = null;
    let media_path: string | null = null;

    if (file && file.size > 0) {
      await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {/* already exists */});
      const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
      const ab          = await file.arrayBuffer();
      const buffer      = Buffer.from(ab);
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });
      if (!uploadErr) {
        media_path = storagePath;
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 30); // 30 days
        media_url = signed?.signedUrl ?? null;
      }
    }

    const { data, error: dbErr } = await supabase
      .from('ped_entries')
      .insert({
        date,
        title:        title.trim(),
        description:  description?.trim() || null,
        platform,
        content_type,
        status,
        assigned_to:  assigned_to?.trim() || null,
        notes:        notes?.trim() || null,
        media_url,
      })
      .select()
      .single();

    if (dbErr) {
      if (media_path) await supabase.storage.from(BUCKET).remove([media_path]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error('[ped POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
