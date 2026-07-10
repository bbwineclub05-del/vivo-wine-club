// POST /api/upsell/track
// Body: { upsellConfigId, eventType, checkoutContext, orderId? }
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    await db.from('upsell_analytics').insert({
      upsell_config_id:  body.upsellConfigId ?? null,
      event_type:        body.eventType,
      checkout_context:  body.checkoutContext ?? null,
      order_id:          body.orderId ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
