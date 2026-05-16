import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { dbEventToEventData, type DbEvent } from '@/lib/events';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEventConfirmationEmails } from '@/app/api/checkout/event/route';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

/**
 * GET /api/checkout/confirm?session_id=cs_xxx
 *
 * Called by the success page after Stripe redirects back.
 * - For merch orders: marks discount code as used.
 * - For event orders: sends confirmation emails (buyer + admin) with QR code.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const meta = session.metadata ?? {};

    // ── Event order ───────────────────────────────────────────────────────────
    if (meta.type === 'event') {
      // Resolve event from Supabase
      let event;
      try {
        const supabaseAdmin = getSupabaseAdmin();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabaseAdmin as any)
          .from('events').select('*').eq('slug', meta.event_slug).single();
        if (data) event = dbEventToEventData(data as DbEvent);
      } catch {/* ignore */}
      if (!event) {
        return NextResponse.json({ error: 'Event not found in metadata' }, { status: 400 });
      }

      const qty   = parseInt(meta.ticket_count, 10) || 1;
      const total = event.price * qty;

      await sendEventConfirmationEmails({
        orderId:   meta.order_id,
        event,
        firstName: meta.buyer_first_name,
        lastName:  meta.buyer_last_name,
        email:     meta.buyer_email,
        phone:     meta.buyer_phone,
        qty,
        total,
      });

      return NextResponse.json({
        ok:       true,
        type:     'event',
        order_id: meta.order_id,
        event: {
          title:        event.title,
          month:        event.month,
          day:          event.day,
          year:         event.year,
          time:         event.time ?? null,
          locationFull: event.locationFull,
          qty,
        },
      });
    }

    // ── Merch order — mark discount code as used + save to merch_orders ─────────
    const code = meta.discount_code;
    if (code) {
      await supabase
        .from('discount_codes')
        .update({ used: true })
        .eq('code', code)
        .eq('used', false);
    }

    // Persist order for admin panel (idempotent via stripe_session_id UNIQUE)
    try {
      const sessionWithItems = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items'],
      });
      const lineItems = sessionWithItems.line_items?.data ?? [];
      const items = lineItems.map((li) => ({
        name:  (li.description ?? '').replace(/\s*\([−\-]\d+%\)$/, '').trim(),
        qty:   li.quantity ?? 1,
        price: li.amount_subtotal != null ? li.amount_subtotal / li.quantity! / 100 : 0,
      }));
      const total = (sessionWithItems.amount_total ?? 0) / 100;
      const customerName  = sessionWithItems.customer_details?.name  ?? null;
      const customerEmail = sessionWithItems.customer_details?.email ?? null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (getSupabaseAdmin() as any).from('merch_orders').upsert({
        stripe_session_id: sessionId,
        customer_name:     customerName,
        customer_email:    customerEmail,
        items,
        total,
        status:            'da_evadere',
        created_at:        new Date(sessionWithItems.created * 1000).toISOString(),
      }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
    } catch (orderErr) {
      console.error('[confirm] merch_orders upsert error (non-fatal):', orderErr);
    }

    return NextResponse.json({ ok: true, type: 'merch', discount_code: code ?? null });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
  }
}
