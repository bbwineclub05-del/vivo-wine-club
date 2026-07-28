import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '@/lib/consent';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

interface CartItem {
  id: string;
  name: string;
  price: number;   // euros (e.g. 35)
  quantity: number;
  icon: string;
  variantId?: string | null;
  size?: string | null;
  shippingCost?: number | null;
}

export async function POST(request: Request) {
  try {
    const { items, discountCode, validateOnly, shippingCost, customerEmail, consentPrivacyTerms }: {
      items: CartItem[]; discountCode?: string; validateOnly?: boolean; shippingCost?: number; customerEmail?: string; consentPrivacyTerms?: boolean;
    } = await request.json();

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

    // Privacy Policy + Terms of Service consent is REQUIRED — reject if not explicitly true
    if (consentPrivacyTerms !== true) {
      return NextResponse.json({ error: 'Consent to the Privacy Policy and Terms of Service is required.' }, { status: 400 });
    }
    const consentNow = new Date().toISOString();
    const consentIp  = getClientIp(request);

    // ── Stock check (preliminary, non-locking) ──────────────────────────────────
    if (items.some(item => item.variantId !== undefined || item.size !== undefined)) {
      const db = getSupabaseAdmin() as any; // eslint-disable-line
      for (const item of items) {
        const vid = item.variantId ?? null;
        const sz  = item.size      ?? null;
        let query = db.from('product_stock').select('quantity').eq('product_id', item.id);
        query = vid ? query.eq('variant_id', vid) : query.is('variant_id', null);
        query = sz  ? query.eq('size', sz)        : query.is('size', null);
        const { data: row } = await query.maybeSingle();
        if (row && row.quantity < item.quantity) {
          const avail = row.quantity;
          return NextResponse.json({
            error: avail === 0
              ? `"${item.name}" è esaurito.`
              : `Disponibili solo ${avail} pezzi di "${item.name}".`,
            stockError: true,
            itemName: item.name,
            available: avail,
          }, { status: 400 });
        }
      }
    }

    // ── Build line items (apply discount if any) ─────────────────────────────
    const multiplier   = discountPercent > 0 ? (100 - discountPercent) / 100 : 1;
    const shippingEur  = typeof shippingCost === 'number' && shippingCost > 0 ? shippingCost : 0;

    const lineItems = [
      ...items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency:     'eur',
          unit_amount:  Math.round(item.price * 100 * multiplier),
          product_data: {
            name: discountPercent > 0
              ? `${item.name} (−${discountPercent}%)`
              : item.name,
            description: `Vivo Wine Club — ${item.name}`,
          },
        },
      })),
      // Shipping as a separate line item (only if > 0)
      ...(shippingEur > 0 ? [{
        quantity: 1,
        price_data: {
          currency:     'eur',
          unit_amount:  Math.round(shippingEur * 100),
          product_data: {
            name:        'Spedizione',
            description: 'Costo di spedizione — Vivo Wine Club',
          },
        },
      }] : []),
    ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
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
        shipping_cost:     shippingEur.toString(),
        stock_adjustments: JSON.stringify(items.map((item) => ({
          product_id: item.id,
          variant_id: item.variantId ?? null,
          size:       item.size       ?? null,
          qty:        item.quantity,
        }))),
        consent_privacy_at:      consentNow,
        consent_privacy_version: PRIVACY_POLICY_VERSION,
        consent_terms_at:        consentNow,
        consent_terms_version:   TERMS_OF_SERVICE_VERSION,
        consent_ip:              consentIp ?? '',
      },
      locale: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
