import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { APPLICATION_TYPES, getApplicationType } from '@/lib/applications';

/**
 * GET /api/admin/applications?type=ambassador
 *   All applications of that type (explicit column list — never consent_ip).
 *
 * GET /api/admin/applications?summary=1
 *   Pending count per type + total, for the sidebar badge.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (searchParams.get('summary') === '1') {
    const results = await Promise.all(
      APPLICATION_TYPES.map((t) =>
        db.from(t.table).select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ),
    );
    const pending: Record<string, number> = {};
    for (const [i, t] of APPLICATION_TYPES.entries()) {
      const { count, error } = results[i];
      // HEAD count queries can fail with error === null and count === null.
      if (error || count === null) {
        console.error(`[admin/applications] summary error (${t.key}):`, error?.message ?? 'null count');
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
      }
      pending[t.key] = count;
    }
    const total = Object.values(pending).reduce((a, b) => a + b, 0);
    return NextResponse.json({ pending, total });
  }

  const type = getApplicationType(searchParams.get('type'));
  if (!type) return NextResponse.json({ error: 'Unknown application type' }, { status: 400 });

  const { data, error } = await db
    .from(type.table)
    .select(type.columns.join(','))
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[admin/applications] list error (${type.key}):`, error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  return NextResponse.json({ applications: data ?? [] });
}
