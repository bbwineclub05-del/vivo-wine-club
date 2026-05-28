import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/merch/products/[id]/variant-combinations ─────────────────────────
// Returns all colour+text combinations for a product.
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_variant_combinations')
    .select('id, text_variant_id, color_variant_id, images')
    .eq('product_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ combinations: data ?? [] });
}

// ── PUT /api/merch/products/[id]/variant-combinations ─────────────────────────
// Save a single combination by (text_variant_id, color_variant_id).
// Checks for an existing row first, then UPDATEs or INSERTs accordingly
// (avoids relying on a UNIQUE constraint for ON CONFLICT).
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { text_variant_id, color_variant_id, images } = await request.json();

  if (!text_variant_id || !color_variant_id) {
    return NextResponse.json(
      { error: 'text_variant_id e color_variant_id sono obbligatori' },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db  = getSupabaseAdmin() as any;
  const imgs = images ?? [];

  // 1. Look for an existing row matching this text+colour pair
  const { data: existing, error: selectError } = await db
    .from('product_variant_combinations')
    .select('id')
    .eq('text_variant_id',  text_variant_id)
    .eq('color_variant_id', color_variant_id)
    .maybeSingle();

  if (selectError) return NextResponse.json({ error: selectError.message }, { status: 500 });

  let data, writeError;

  if (existing) {
    // 2a. Row exists → UPDATE images
    ({ data, error: writeError } = await db
      .from('product_variant_combinations')
      .update({ images: imgs })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    // 2b. No row yet → INSERT
    ({ data, error: writeError } = await db
      .from('product_variant_combinations')
      .insert({
        product_id:       id,
        text_variant_id,
        color_variant_id,
        images:           imgs,
      })
      .select()
      .single());
  }

  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });
  return NextResponse.json({ combination: data });
}
