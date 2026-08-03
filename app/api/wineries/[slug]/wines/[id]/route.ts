import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string; id: string }> };

/** PATCH /api/wineries/[slug]/wines/[id] — admin/staff only */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug, id } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed = ['name', 'vintage', 'grape', 'rating', 'note', 'bottle_photo_url', 'sort_order'] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('winery_wines')
    .update(patch)
    .eq('id', id)
    .eq('winery_slug', slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wine: data });
}

/** DELETE /api/wineries/[slug]/wines/[id] — admin/staff only */
export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug, id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { error } = await db
    .from('winery_wines')
    .delete()
    .eq('id', id)
    .eq('winery_slug', slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
