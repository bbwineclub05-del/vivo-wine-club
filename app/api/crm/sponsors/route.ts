import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { data, error } = await db()
    .from('sponsors')
    .select('id, name, email')
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sponsors: data ?? [] });
}
