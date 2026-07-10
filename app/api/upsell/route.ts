// GET /api/upsell?context=event&slug=xyz
// Returns active upsell configs joined with product data
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface UpsellConfigWithProduct {
  id: string;
  product_id: string;
  context: 'event' | 'merch';
  target_slug: string | null;
  sort_order: number;
  active: boolean;
  products: {
    id: string;
    title: string;
    price: number;
    images: string[];
    slug: string;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const context = searchParams.get('context') ?? 'event';
  const slug    = searchParams.get('slug') ?? '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  let query = db
    .from('upsell_configs')
    .select('id, product_id, context, target_slug, sort_order, active, products!product_id(id, title, price, images, slug)')
    .eq('active', true)
    .eq('context', context)
    .order('sort_order', { ascending: true });

  // Filter: target_slug IS NULL (applies to all) OR target_slug = specific slug
  if (slug) {
    query = query.or(`target_slug.is.null,target_slug.eq.${slug}`);
  } else {
    query = query.is('target_slug', null);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter out any rows where the product join failed (deleted products)
  const configs = (data ?? []).filter((c: UpsellConfigWithProduct) => c.products != null);

  return NextResponse.json({ configs });
}
