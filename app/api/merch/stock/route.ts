import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// ── GET /api/merch/stock?product_id=xxx ───────────────────────────────────────
// Staff can read and update stock levels.
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_stock')
    .select('id, product_id, variant_id, size, quantity, updated_at')
    .eq('product_id', productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stock: data ?? [] });
}

// ── POST /api/merch/stock ─────────────────────────────────────────────────────
// Upsert a stock entry: { product_id, variant_id?, size?, quantity }
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { product_id, variant_id = null, size = null, quantity } = body;

  if (!product_id || quantity === undefined || quantity === null) {
    return NextResponse.json({ error: 'product_id and quantity are required' }, { status: 400 });
  }
  if (typeof quantity !== 'number' || quantity < 0) {
    return NextResponse.json({ error: 'quantity must be a non-negative number' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Find existing row (handle NULL comparisons)
  let query = db
    .from('product_stock')
    .select('id')
    .eq('product_id', product_id);
  query = variant_id ? query.eq('variant_id', variant_id) : query.is('variant_id', null);
  query = size       ? query.eq('size', size)             : query.is('size', null);
  const { data: existing } = await query.maybeSingle();

  let result;
  if (existing?.id) {
    const { data, error } = await db
      .from('product_stock')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await db
      .from('product_stock')
      .insert({ product_id, variant_id, size, quantity })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json({ stock: result });
}
