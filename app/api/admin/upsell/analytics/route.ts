// GET /api/admin/upsell/analytics
// Returns upsell_analytics rows grouped by upsell_config_id
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('upsell_analytics')
    .select('upsell_config_id, event_type');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group in JS
  const map = new Map<string | null, { impressions: number; added: number; converted: number }>();

  for (const row of (data ?? [])) {
    const key = row.upsell_config_id ?? null;
    if (!map.has(key)) map.set(key, { impressions: 0, added: 0, converted: 0 });
    const entry = map.get(key)!;
    if (row.event_type === 'impression') entry.impressions++;
    else if (row.event_type === 'added')  entry.added++;
    else if (row.event_type === 'converted') entry.converted++;
  }

  const analytics = Array.from(map.entries()).map(([config_id, counts]) => ({
    config_id,
    ...counts,
  }));

  return NextResponse.json({ analytics });
}
