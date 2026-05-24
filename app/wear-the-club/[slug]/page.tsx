import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import ProductDetailClient from './ProductDetailClient';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id:           string;
  color_name:   string;
  display_name: string | null;
  color_hex:    string;
  images:       string[];
  sort_order:   number;
}

export interface StockEntry {
  variant_id: string | null;
  size:       string | null;
  quantity:   number;
}

export interface ProductDetails {
  material?:   string;
  dimensions?: string;
  care?:       string;
  shipping?:   string;
}

export interface ProductTextVariant {
  id:         string;
  text_label: string;
  images:     string[];
  sort_order: number;
}

export interface ProductVariantCombination {
  id:               string;
  text_variant_id:  string;
  color_variant_id: string;
  images:           string[];
}

export interface ProductFull {
  id:                          string;
  title:                       string;
  description:                 string;
  price:                       number;
  sizes:                       string[];
  images:                      string[];
  shipping_cost:               number | null;
  slug:                        string | null;
  details:                     ProductDetails | null;
  product_variants:            ProductVariant[];
  product_stock:               StockEntry[];
  product_text_variants:       ProductTextVariant[];
  product_variant_combinations: ProductVariantCombination[];
}

// ── Data fetching ─────────────────────────────────────────────────────────────

// Full select — requires shipping_cost, slug, details, display_name, text_variants columns/tables
const SELECT_FULL = `
  id, title, description, price, sizes, images, shipping_cost, slug, details,
  product_variants      ( id, color_name, display_name, color_hex, images, sort_order ),
  product_stock         ( variant_id, size, quantity ),
  product_text_variants ( id, text_label, images, sort_order )
`;

// Base select — works even before migrations add the new columns
const SELECT_BASE = `
  id, title, description, price, sizes, images,
  product_variants ( id, color_name, color_hex, images, sort_order ),
  product_stock    ( variant_id, size, quantity )
`;

function isColumnError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  return (
    err.message?.includes('does not exist') ||
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    err.code === '42P01'
  );
}

async function fetchProduct(param: string): Promise<ProductFull | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const withOrder = (q: ReturnType<typeof db.from>) =>
    q
      .eq('visible', true)
      .order('sort_order', { ascending: true, referencedTable: 'product_variants' })
      .maybeSingle();

  // Determine the select to use (full first, fall back to base if columns missing)
  let useBase = false;

  // ── Try by slug ──
  let { data, error } = await withOrder(
    db.from('products').select(SELECT_FULL).eq('slug', param),
  );

  if (isColumnError(error)) {
    useBase = true;
    console.warn('[product/slug] New columns missing — falling back to base select:', error.message);
    ({ data, error } = await withOrder(
      db.from('products').select(SELECT_BASE).eq('slug', param),
    ));
  }

  // ── Fallback: param might be a UUID (id lookup) ──
  if (!data && !isColumnError(error)) {
    ({ data, error } = await withOrder(
      db.from('products').select(useBase ? SELECT_BASE : SELECT_FULL).eq('id', param),
    ));

    // If we haven't fallen back yet and this query also has a column error, retry with base
    if (isColumnError(error)) {
      useBase = true;
      console.warn('[product/slug] New columns missing on id lookup — falling back to base select:', error?.message);
      ({ data } = await withOrder(
        db.from('products').select(SELECT_BASE).eq('id', param),
      ));
    }
  }

  if (!data) return null;

  // Fetch combinations separately (table may not exist yet — fail gracefully)
  let combinations: ProductVariantCombination[] = [];
  try {
    const { data: combData, error: combError } = await db
      .from('product_variant_combinations')
      .select('id, text_variant_id, color_variant_id, images')
      .eq('product_id', data.id);
    if (!combError) {
      combinations = (combData ?? []).filter(
        (c: ProductVariantCombination) => Array.isArray(c.images),
      );
    }
  } catch {
    // table not yet created — combinations stays []
  }

  // Normalise missing columns so the rest of the code can rely on them existing
  return {
    shipping_cost: null,
    slug:          null,
    details:       null,
    ...data,
    product_variants: (data.product_variants ?? []).map((v: ProductVariant) => ({
      ...v,
      display_name: v.display_name ?? null,
    })),
    product_text_variants:        data.product_text_variants ?? [],
    product_variant_combinations: combinations,
  } as ProductFull;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return {};
  return {
    title:       `${product.title} — Vivo Wine Club`,
    description: product.description || `Shop ${product.title} at Vivo Wine Club.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#faf7f7] pt-16">
        <ProductDetailClient product={product} />
      </main>
      <Footer />
    </>
  );
}
