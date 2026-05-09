import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAdminEmail } from '@/lib/admins';

/**
 * GET /api/crm/customers
 * Returns all customers ordered by last_purchase_at desc. Admin only.
 */
export async function GET(request: Request) {
  const authHeader  = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } =
    await getSupabaseAdmin().auth.getUser(accessToken);

  if (authError || !user || !isAdminEmail(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customers, error } = await (getSupabaseAdmin() as any)
    .from('customers')
    .select('id, email, name, first_purchase_at, last_purchase_at, total_events, events')
    .order('last_purchase_at', { ascending: false });

  if (error) {
    console.error('[crm/customers] DB error:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ customers: customers ?? [] });
}
