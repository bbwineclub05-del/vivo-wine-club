import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// ── GET /api/merch/products/public ────────────────────────────────────────────
// Public endpoint — no auth required. Returns only visible products with their
// color variants embedded (sorted by sort_order).
//
// Tries a full select first (includes newer columns shipping_cost / display_name).
// If Supabase reports a missing column, falls back to the base select so the
// shop keeps working even before those SQL migrations are applied.
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const ORDER = (q: ReturnType<typeof db.from>) =>
    q
      .eq('visible', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .order('sort_order', { ascending: true, referencedTable: 'product_variants' });

  // ── Attempt 1: full select (needs shipping_cost + display_name + text_variants) ──
  let { data, error } = await ORDER(
    db.from('products').select(`
      id, title, description, price, sizes, images, sort_order, shipping_cost, slug, details,
      product_variants      ( id, color_name, display_name, color_hex, images, sort_order ),
      product_stock         ( variant_id, size, quantity ),
      product_text_variants ( id, text_label, images, sort_order )
    `),
  );

  // ── Fallback: columns/tables may not exist yet in the DB ──
  const isColumnError =
    error &&
    (error.message?.includes('does not exist') ||
      error.code === 'PGRST204' ||
      error.code === '42703' ||
      error.code === '42P01');

  if (isColumnError) {
    console.warn('[products/public] New columns/tables missing — falling back to base select. Run SQL migrations to fix:', error.message);
    ({ data, error } = await ORDER(
      db.from('products').select(`
        id, title, description, price, sizes, images, sort_order,
        product_variants ( id, color_name, color_hex, images, sort_order ),
        product_stock    ( variant_id, size, quantity )
      `),
    ));
  }

  if (error) {
    console.error('[products/public] Query failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}
