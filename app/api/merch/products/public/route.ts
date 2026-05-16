import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// ── GET /api/merch/products/public ────────────────────────────────────────────
// Public endpoint — no auth required. Returns only visible products with their
// color variants embedded (sorted by sort_order).
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('products')
    .select(`
      id, title, description, price, sizes, images, sort_order,
      product_variants ( id, color_name, color_hex, images, sort_order ),
      product_stock    ( variant_id, size, quantity )
    `)
    .eq('visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .order('sort_order', { ascending: true, referencedTable: 'product_variants' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}
