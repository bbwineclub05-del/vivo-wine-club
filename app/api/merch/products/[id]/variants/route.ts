import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/merch/products/[id]/variants ─────────────────────────────────────
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variants: data ?? [] });
}

// ── POST /api/merch/products/[id]/variants ────────────────────────────────────
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { color_name, display_name, color_hex, images, sort_order } = await request.json();

  if (!color_name || !color_hex) {
    return NextResponse.json({ error: 'color_name e color_hex sono obbligatori' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('product_variants')
    .insert({
      product_id:   id,
      color_name,
      display_name: display_name ?? null,
      color_hex,
      images:       images ?? [],
      sort_order:   sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: data });
}
