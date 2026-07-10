// GET  /api/admin/upsell  — list all configs joined with products (admin/staff)
// POST /api/admin/upsell  — create one config (admin/staff)
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await db()
    .from('upsell_configs')
    .select('id, product_id, context, target_slug, sort_order, active, created_at, products!product_id(id, title, price, images, slug)')
    .order('context')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configs: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { product_id, context, target_slug, sort_order, active } = body;

  if (!product_id) return NextResponse.json({ error: 'product_id obbligatorio' }, { status: 400 });

  const { data, error } = await db()
    .from('upsell_configs')
    .insert({
      product_id,
      context:     context     ?? 'event',
      target_slug: target_slug ?? null,
      sort_order:  sort_order  ?? 0,
      active:      active      ?? true,
    })
    .select('id, product_id, context, target_slug, sort_order, active, created_at, products!product_id(id, title, price, images, slug)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data }, { status: 201 });
}

// Bulk save: accepts { context, target_slug, product_ids[] }
// Replaces all configs for that context+target with the given product_ids
export async function PUT(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { context, target_slug, product_ids } = body as {
    context:     'event' | 'merch';
    target_slug: string | null;
    product_ids: string[];
  };

  if (!context) return NextResponse.json({ error: 'context obbligatorio' }, { status: 400 });

  const d = db();

  // Delete existing configs for this context + target
  let deleteQ = d.from('upsell_configs').delete().eq('context', context);
  if (target_slug) {
    deleteQ = deleteQ.eq('target_slug', target_slug);
  } else {
    deleteQ = deleteQ.is('target_slug', null);
  }
  const { error: delErr } = await deleteQ;
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // Insert new rows (one per product_id)
  if (product_ids.length > 0) {
    const rows = product_ids.map((pid, i) => ({
      product_id:  pid,
      context,
      target_slug: target_slug ?? null,
      sort_order:  i,
      active:      true,
    }));
    const { error: insErr } = await d.from('upsell_configs').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
