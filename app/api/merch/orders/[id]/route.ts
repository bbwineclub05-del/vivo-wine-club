import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { sendMerchShippingNotification } from '@/lib/merch-email';

// ── PATCH /api/merch/orders/[id] — update status ──────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { status } = await request.json();

  if (status !== 'da_evadere' && status !== 'evaso') {
    return NextResponse.json({ error: 'status deve essere da_evadere o evaso' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('merch_orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}

// ── POST /api/merch/orders/[id] — send shipping notification email ─────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const { data: order, error } = await db
    .from('merch_orders')
    .select('customer_email, customer_name, items, total')
    .eq('id', id)
    .single();

  if (error || !order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  if (!order.customer_email) return NextResponse.json({ error: 'Nessuna email per questo ordine' }, { status: 400 });

  await sendMerchShippingNotification({
    to:    order.customer_email,
    name:  order.customer_name,
    items: order.items,
    total: Number(order.total),
  });

  return NextResponse.json({ ok: true });
}
