import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';
import { resolveAccess, PERMISSION_KEYS, type TeamRow } from '@/lib/access';

/**
 * GET /api/team/me
 *
 * What the signed-in person may open. The answer comes from
 * `team_members` through `resolveAccess`, so Team Management is binding:
 * a row switched off closes the area, a toggle switched off closes that
 * section, and the board is not exempt. The single exception, the super
 * admin, is written down in lib/access.ts.
 */
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  let row: TeamRow | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data } = await db
      .from('team_members')
      .select('permissions, active, role')
      .eq('email', auth.email)
      .maybeSingle();
    row = (data as TeamRow | null) ?? null;
  } catch (err) {
    // A failed lookup must not quietly hand out full access.
    console.error('[team/me] lookup failed:', err instanceof Error ? err.message : err);
  }

  const access = resolveAccess(auth.email, row);

  // Expanded to an explicit answer per key, so the rules stay in one
  // file instead of being re-implemented on the client.
  const permissions = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, access.can(key)]));

  return NextResponse.json({
    permissions,
    active: access.active,
    board: access.board,
  });
}
