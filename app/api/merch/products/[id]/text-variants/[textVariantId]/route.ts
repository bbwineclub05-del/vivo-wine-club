import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

type Ctx = { params: Promise<{ id: string; textVariantId: string }> };

// ── PATCH /api/merch/products/[id]/text-variants/[textVariantId] ──────────────
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { textVariantId } = await params;
  const body = await request.json();
  const { text_label, images, sort_order } = body;

  const updates: Record<string, unknown> = {};
  if (text_label  !== undefined) updates.text_label  = text_label;
  if (images      !== undefined) updates.images      = images;
  if (sort_order  !== undefined) updates.sort_order  = sort_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_text_variants')
    .update(updates)
    .eq('id', textVariantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ textVariant: data });
}

// ── DELETE /api/merch/products/[id]/text-variants/[textVariantId] ─────────────
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { textVariantId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { error } = await db.from('product_text_variants').delete().eq('id', textVariantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
