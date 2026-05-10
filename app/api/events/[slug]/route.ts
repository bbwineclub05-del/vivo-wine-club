import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

/* ── GET: single event — DB-first, static fallback ── */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (data) return NextResponse.json({ event: data, source: 'db' });
  } catch {/* fall through */}

  return NextResponse.json({ error: 'Event not found' }, { status: 404 });
}

/* ── PATCH: admin or staff — update event ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;

  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const supabase = getSupabaseAdmin();
    const priceNum = typeof body.price === 'number' ? body.price : null;

    // If price is set and > 0, ensure a Stripe product exists
    if (priceNum && priceNum > 0 && process.env.STRIPE_SECRET_KEY) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
          .from('events')
          .select('stripe_product_id, stripe_price_id, price')
          .eq('slug', slug)
          .single();

        // Create new Stripe product if none exists or price changed
        if (!existing?.stripe_product_id || existing.price !== priceNum) {
          const product  = await stripe.products.create({
            name:        (body.title as string) || slug,
            description: `${body.date ?? ''} · ${body.location_full ?? body.location ?? ''}`,
          });
          const priceObj = await stripe.prices.create({
            product:     product.id,
            unit_amount: Math.round(priceNum * 100),
            currency:    'eur',
          });
          body.stripe_product_id = product.id;
          body.stripe_price_id   = priceObj.id;
          console.log(`[events PATCH] Stripe product created: ${product.id}`);
        }
      } catch (stripeErr) {
        console.error('[events PATCH] Stripe error:', stripeErr);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('events')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  } catch (err) {
    console.error('[events PATCH]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/* ── DELETE: admin or staff — remove event ── */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;

  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('events')
      .delete()
      .eq('slug', slug);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[events DELETE]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
