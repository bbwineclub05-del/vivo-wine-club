import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

// ── GET /api/merch/settings — public ─────────────────────────────────────────
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('settings')
    .select('key, value')
    .in('key', ['shipping_cost']);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: Record<string, number | string> = {};
  for (const row of data ?? []) {
    result[row.key] = isNaN(Number(row.value)) ? row.value : Number(row.value);
  }
  return NextResponse.json(result);
}

// ── PATCH /api/merch/settings — admin only ────────────────────────────────────
export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const updates: Promise<unknown>[] = [];
  if (body.shipping_cost !== undefined) {
    const val = Number(body.shipping_cost);
    if (isNaN(val) || val < 0) {
      return NextResponse.json({ error: 'shipping_cost must be a non-negative number' }, { status: 400 });
    }
    updates.push(
      db.from('settings').upsert({ key: 'shipping_cost', value: val.toFixed(2), updated_at: new Date().toISOString() })
    );
  }

  if (updates.length === 0) return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
  await Promise.all(updates);

  return NextResponse.json({ ok: true });
}
