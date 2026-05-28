import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/merch/products/[id]/text-variants ────────────────────────────────
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_text_variants')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ textVariants: data ?? [] });
}

// ── POST /api/merch/products/[id]/text-variants ───────────────────────────────
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { text_label, images, sort_order } = await request.json();

  if (!text_label?.trim()) {
    return NextResponse.json({ error: 'text_label è obbligatorio' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_text_variants')
    .insert({
      product_id: id,
      text_label: text_label.trim(),
      images:     images ?? [],
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ textVariant: data });
}
