import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  let query = db.from('stock_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (productId) query = query.eq('product_id', productId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data ?? [] });
}
