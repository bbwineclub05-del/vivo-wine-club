import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

interface CartItem {
  id: string;
  name: string;
  price: number;   // euros, integer (e.g. 35)
  quantity: number;
  icon: string;
  variantId?: string | null;
  size?: string | null;
}

export async function POST(request: Request) {
  try {
    const { items, discountCode, validateOnly }: { items: CartItem[]; discountCode?: string; validateOnly?: boolean } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // ── Validate discount code ───────────────────────────────────────────────
    let discountPercent = 0;
    let validatedCode: string | null = null;

    if (discountCode?.trim()) {
      const code = discountCode.trim().toUpperCase();
      const { data: discount, error: discountError } = await supabase
        .from('discount_codes')
        .select('code, discount_percent, used, expires_at')
        .eq('code', code)
        .single();

      if (discountError || !discount) {
        return NextResponse.json({ error: 'Invalid discount code.' }, { status: 400 });
      }
      if (discount.used) {
        return NextResponse.json({ error: 'This discount code has already been used.' }, { status: 400 });
      }
      if (new Date(discount.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This discount code has expired.' }, { status: 400 });
      }

      discountPercent = discount.discount_percent as number;
      validatedCode   = code;
    }

    // Validation-only request: just confirm the code is valid, don't create a session
    if (validateOnly) {
      return NextResponse.json({ ok: true, discountPercent });
    }

    // ── Build line items (apply discount if any) ─────────────────────────────
    const multiplier = discountPercent > 0 ? (100 - discountPercent) / 100 : 1;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(item.price * 100 * multiplier),
          product_data: {
            name: discountPercent > 0
              ? `${item.name} (−${discountPercent}%)`
              : item.name,
            description: `Vivo Wine Club — ${item.name}`,
          },
        },
      })),
      success_url: 'https://vivowineclub.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  'https://vivowineclub.com/wear-the-club',
      shipping_address_collection: {
        allowed_countries: ['IT', 'FR', 'DE', 'ES', 'GB', 'CH', 'AT', 'BE', 'NL', 'PT'],
      },
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      custom_fields: [
        {
          key:      'delivery_notes',
          label:    { type: 'custom', custom: 'Delivery notes (floor, doorbell, etc.)' },
          type:     'text',
          optional: true,
        },
      ],
      metadata: {
        discount_code:     validatedCode ?? '',
        stock_adjustments: JSON.stringify(items.map((item) => ({
          product_id: item.id,
          variant_id: item.variantId ?? null,
          size:       item.size       ?? null,
          qty:        item.quantity,
        }))),
      },
      locale: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
