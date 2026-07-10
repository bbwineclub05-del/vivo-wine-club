// PATCH /api/admin/upsell/[id]
// DELETE /api/admin/upsell/[id]
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await db()
    .from('upsell_configs')
    .update(body)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const { error } = await db().from('upsell_configs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
