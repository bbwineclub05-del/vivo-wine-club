import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

// ── GET /api/merch/products ────────────────────────────────────────────────────
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

// ── POST /api/merch/products ───────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { title, description, price, sizes, colors, images, visible, shipping_cost } = await request.json();
  if (!title || price == null) {
    return NextResponse.json({ error: 'title e price sono obbligatori' }, { status: 400 });
  }

  // Create Stripe product + price
  let stripeProductId: string | null = null;
  let stripePriceId:   string | null = null;

  try {
    const sp = await stripe.products.create({
      name:        title,
      description: description || undefined,
      active:      !!visible,
    });
    const spr = await stripe.prices.create({
      product:     sp.id,
      unit_amount: Math.round(Number(price) * 100),
      currency:    'eur',
    });
    stripeProductId = sp.id;
    stripePriceId   = spr.id;
  } catch (stripeErr) {
    console.error('[merch/products POST] Stripe error:', stripeErr);
    // Non-fatal — product still created in DB
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('products')
    .insert({
      title,
      description:       description ?? '',
      price:             Number(price),
      sizes:             sizes ?? [],
      colors:            colors ?? [],
      images:            images ?? [],
      visible:           visible ?? true,
      shipping_cost:     shipping_cost != null ? Number(shipping_cost) : null,
      stripe_product_id: stripeProductId,
      stripe_price_id:   stripePriceId,
      updated_at:        new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}
