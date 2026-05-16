import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

type Ctx = { params: Promise<{ id: string; variantId: string }> };

// ── PATCH /api/merch/products/[id]/variants/[variantId] ───────────────────────
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { variantId } = await params;
  const body = await request.json();
  const { color_name, color_hex, images, sort_order } = body;

  const updates: Record<string, unknown> = {};
  if (color_name  !== undefined) updates.color_name  = color_name;
  if (color_hex   !== undefined) updates.color_hex   = color_hex;
  if (images      !== undefined) updates.images      = images;
  if (sort_order  !== undefined) updates.sort_order  = sort_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_variants')
    .update(updates)
    .eq('id', variantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: data });
}

// ── DELETE /api/merch/products/[id]/variants/[variantId] ──────────────────────
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { variantId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { error } = await db.from('product_variants').delete().eq('id', variantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
