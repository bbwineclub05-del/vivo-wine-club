import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

// ── PATCH /api/merch/products/[id] ────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { title, description, price, sizes, colors, images, visible, sort_order, shipping_cost, slug, details } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Fetch current row to compare price and get Stripe IDs
  const { data: current } = await db.from('products').select('*').eq('id', id).single();
  if (!current) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title         !== undefined) updates.title         = title;
  if (description   !== undefined) updates.description   = description;
  if (price         !== undefined) updates.price         = Number(price);
  if (sizes         !== undefined) updates.sizes         = sizes;
  if (colors        !== undefined) updates.colors        = colors;
  if (images        !== undefined) updates.images        = images;
  if (visible       !== undefined) updates.visible       = visible;
  if (sort_order    !== undefined) updates.sort_order    = sort_order;
  if (shipping_cost !== undefined) updates.shipping_cost = shipping_cost === null ? null : Number(shipping_cost);
  if (slug          !== undefined) updates.slug          = slug || null;
  if (details       !== undefined) updates.details       = details ?? null;

  // Sync Stripe product/price if relevant fields changed
  try {
    if (current.stripe_product_id) {
      const stripeUpdate: Record<string, unknown> = {};
      if (title       !== undefined) stripeUpdate.name        = title;
      if (description !== undefined) stripeUpdate.description = description || undefined;
      if (visible     !== undefined) stripeUpdate.active      = visible;
      if (Object.keys(stripeUpdate).length > 0) {
        await stripe.products.update(current.stripe_product_id, stripeUpdate);
      }

      // Price change → archive old price, create new one
      if (price !== undefined && Number(price) !== Number(current.price)) {
        if (current.stripe_price_id) {
          await stripe.prices.update(current.stripe_price_id, { active: false });
        }
        const newPrice = await stripe.prices.create({
          product:     current.stripe_product_id,
          unit_amount: Math.round(Number(price) * 100),
          currency:    'eur',
        });
        updates.stripe_price_id = newPrice.id;
      }
    }
  } catch (stripeErr) {
    console.error('[merch/products PATCH] Stripe sync error:', stripeErr);
  }

  const { data, error } = await db
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

// ── DELETE /api/merch/products/[id] ───────────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const { data: current } = await db.from('products').select('stripe_product_id').eq('id', id).single();

  // Archive Stripe product (can't permanently delete if it has prices)
  if (current?.stripe_product_id) {
    try {
      await stripe.products.update(current.stripe_product_id, { active: false });
    } catch (stripeErr) {
      console.error('[merch/products DELETE] Stripe error:', stripeErr);
    }
  }

  const { error } = await db.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
