import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// ── GET /api/merch/products/public ────────────────────────────────────────────
// Public endpoint — no auth required. Returns only visible products.
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('products')
    .select('id, title, description, price, sizes, colors, images, sort_order')
    .eq('visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}
