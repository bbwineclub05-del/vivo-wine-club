import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

/** PATCH /api/crm/categories/[id]/contacts/[contactId] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { contactId } = await params;
  const body = await request.json().catch(() => ({}));
  const { first_name, last_name, email, phone, notes } = body;
  const { data, error } = await db()
    .from('crm_custom_contacts')
    .update({ first_name, last_name, email, phone, notes })
    .eq('id', contactId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}

/** DELETE /api/crm/categories/[id]/contacts/[contactId] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { contactId } = await params;
  const { error } = await db().from('crm_custom_contacts').delete().eq('id', contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
