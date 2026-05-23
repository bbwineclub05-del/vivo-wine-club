import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const SELECT = `
  id, title, description, price, sizes, images, shipping_cost, slug, details,
  product_variants ( id, color_name, display_name, color_hex, images, sort_order ),
  product_stock    ( variant_id, size, quantity )
`;

// ── GET /api/merch/products/slug/[slug] ───────────────────────────────────────
// Public — no auth required. Returns a single visible product by slug.
// Falls back to ID lookup so old/bookmark links using the product UUID still work.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // 1. Try by slug
  let { data, error } = await db
    .from('products')
    .select(SELECT)
    .eq('visible', true)
    .eq('slug', slug)
    .order('sort_order', { ascending: true, referencedTable: 'product_variants' })
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. Fall back to ID (UUID format)
  if (!data) {
    ({ data, error } = await db
      .from('products')
      .select(SELECT)
      .eq('visible', true)
      .eq('id', slug)
      .order('sort_order', { ascending: true, referencedTable: 'product_variants' })
      .maybeSingle());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  return NextResponse.json({ product: data });
}
