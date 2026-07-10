import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

/** GET /api/crm/categories/[id]/contacts */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const { data, error } = await db()
    .from('crm_custom_contacts')
    .select('*')
    .eq('category_id', id)
    .order('last_name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}

/** POST /api/crm/categories/[id]/contacts */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { first_name = '', last_name = '', email = '', phone = '', notes = '' } = body;
  if (!first_name && !last_name) {
    return NextResponse.json({ error: 'first_name or last_name required' }, { status: 400 });
  }
  const { data, error } = await db()
    .from('crm_custom_contacts')
    .insert({ category_id: id, first_name, last_name, email, phone, notes })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data }, { status: 201 });
}
