import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { sendMerchShippingNotification } from '@/lib/merch-email';

const VALID_STATUSES = ['da_evadere', 'evaso', 'spedito'] as const;

// ── PATCH /api/merch/orders/[id] — update status ──────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { status } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'status non valido' }, { status: 400 });
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

// ── POST /api/merch/orders/[id] — save shipping data + send notification ───────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const { carrier, tracking_code, tracking_url, shipped_at, shipping_notes } = body as {
    carrier?:        string;
    tracking_code?:  string;
    tracking_url?:   string;
    shipped_at?:     string;
    shipping_notes?: string;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Save tracking data + mark as spedito
  const updatePayload: Record<string, unknown> = {
    status:     'spedito',
    carrier:    carrier    || null,
    tracking_code:  tracking_code  || null,
    tracking_url:   tracking_url   || null,
    shipped_at: shipped_at || null,
    shipping_notes: shipping_notes || null,
  };

  const { data: updated, error: updateErr } = await db
    .from('merch_orders')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const order = updated;

  if (!order.customer_email) {
    return NextResponse.json({ error: 'Nessuna email per questo ordine' }, { status: 400 });
  }

  // Build shipping address string for email
  const addrParts = [
    order.shipping_line1,
    order.shipping_line2,
    [order.shipping_postal, order.shipping_city, order.shipping_state].filter(Boolean).join(' '),
    order.shipping_country,
  ].filter(Boolean);
  const shippingAddress = addrParts.join(', ') || null;

  await sendMerchShippingNotification({
    to:             order.customer_email,
    name:           order.customer_name,
    items:          order.items,
    total:          Number(order.total),
    carrier:        order.carrier,
    trackingCode:   order.tracking_code,
    trackingUrl:    order.tracking_url,
    shippingNotes:  order.shipping_notes,
    shippingAddress,
  });

  return NextResponse.json({ ok: true, order });
}
