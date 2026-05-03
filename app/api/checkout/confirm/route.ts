import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

/**
 * GET /api/checkout/confirm?session_id=cs_xxx
 *
 * Called by the success page after Stripe redirects back.
 * Retrieves the Stripe session metadata, finds the discount code used,
 * and marks it as used in Supabase.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const code    = session.metadata?.discount_code;

    if (code) {
      await supabase
        .from('discount_codes')
        .update({ used: true })
        .eq('code', code)
        .eq('used', false); // idempotent: only update if still false
    }

    return NextResponse.json({ ok: true, discount_code: code ?? null });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
  }
}
