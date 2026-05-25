import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, requireAdminOrStaff } from '@/lib/auth-guard';

// GET — any authenticated user (members, staff, admin)
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('member_discounts')
    .select('*')
    .eq('visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ discounts: data ?? [] });
}

// POST — admin or staff only
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { title, description, logo_url, code, partner, expires_at, visible, sort_order } =
    await request.json();
  if (!title?.trim())
    return NextResponse.json({ error: 'Il titolo è obbligatorio' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('member_discounts')
    .insert({
      title:       title.trim(),
      description: description?.trim() || null,
      logo_url:    logo_url || null,
      code:        code?.trim() || null,
      partner:     partner?.trim() || null,
      expires_at:  expires_at || null,
      visible:     visible ?? true,
      sort_order:  sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ discount: data });
}
