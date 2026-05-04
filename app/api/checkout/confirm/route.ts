import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { getEventBySlug } from '@/lib/events';
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
      const event = getEventBySlug(meta.event_slug);
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

      return NextResponse.json({ ok: true, type: 'event', order_id: meta.order_id });
    }

    // ── Merch order — mark discount code as used ──────────────────────────────
    const code = meta.discount_code;
    if (code) {
      await supabase
        .from('discount_codes')
        .update({ used: true })
        .eq('code', code)
        .eq('used', false);
    }

    return NextResponse.json({ ok: true, type: 'merch', discount_code: code ?? null });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
  }
}
