import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const BUCKET = 'media';

/* ── GET /api/media?folder=wine-party ── */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');
  if (!folder) return NextResponse.json({ error: 'folder required' }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = (data ?? []).filter((f: any) => f.name !== '.emptyFolderPlaceholder' && f.name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = files.map((f: any) => ({
      path: `${folder}/${f.name}`,
      url:  supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
      name: f.name,
    }));

    return NextResponse.json({ images });
  } catch (err) {
    console.error('[media GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ── DELETE /api/media?path=wine-party/abc.webp ── */
export async function DELETE(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[media DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
