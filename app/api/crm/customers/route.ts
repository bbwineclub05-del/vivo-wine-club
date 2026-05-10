import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

/**
 * GET /api/crm/customers
 * Returns all customers ordered by last_purchase_at desc. Admin or staff only.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

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
