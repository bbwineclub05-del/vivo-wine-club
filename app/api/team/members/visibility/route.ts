import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireFinanceUser } from '@/lib/auth-guard';

/**
 * PATCH /api/team/members/visibility
 * Body: { email: string, hidden: boolean }
 *
 * Hides/restores a member card in Finance → Conti Member by toggling
 * team_members.accounts_hidden. Only that column is written: role, active
 * and permissions are never touched, and nothing is deleted.
 */
export async function PATCH(request: Request) {
  const auth = await requireFinanceUser(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { email, hidden } = (body ?? {}) as { email?: unknown; hidden?: unknown };
  if (typeof email !== 'string' || !email.trim() || email.length > 320 || typeof hidden !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await db
    .from('team_members')
    .update({ accounts_hidden: hidden })
    .eq('email', email.trim())
    .select('email, accounts_hidden')
    .maybeSingle();

  if (error) {
    console.error('[team/members/visibility] update error:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  return NextResponse.json({ email: data.email, accounts_hidden: data.accounts_hidden === true });
}
