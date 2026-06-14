import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

/* ── PATCH /api/ped/[id] — update entry ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body   = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db     = getSupabaseAdmin() as any;

  const patch: Record<string, unknown> = {};
  if (body.status       !== undefined) patch.status       = body.status;
  if (body.title        !== undefined) patch.title        = body.title;
  if (body.description  !== undefined) patch.description  = body.description  || null;
  if (body.platform     !== undefined) patch.platform     = body.platform;
  if (body.content_type !== undefined) patch.content_type = body.content_type;
  if (body.date         !== undefined) patch.date         = body.date;
  if (body.assigned_to  !== undefined) patch.assigned_to  = body.assigned_to  || null;
  if (body.notes        !== undefined) patch.notes        = body.notes        || null;

  const { data, error } = await db
    .from('ped_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

/* ── DELETE /api/ped/[id] — delete entry ── */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any).from('ped_entries').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
