import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';

export interface TeamMember {
  name:     string;
  email:    string;
  initials: string;
  /** Hidden from the Conti Member cards (Finance). Does not affect access. */
  accounts_hidden: boolean;
}

function buildInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)
    .map(w => w[0].toUpperCase()).join('').slice(0, 2);
}

// GET /api/team/members — returns active team members (any authenticated user)
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const query = (columns: string) => db
    .from('team_members')
    .select(columns)
    .eq('active', true)
    .in('role', ['admin', 'staff'])
    .order('name', { ascending: true });

  let { data, error } = await query('name, email, accounts_hidden');
  // Fallback while the accounts_hidden migration has not been applied yet
  // (42703 = undefined column), so Finance / Tasks keep working.
  if (error?.code === '42703') {
    ({ data, error } = await query('name, email'));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members: TeamMember[] = (data ?? []).map((m: { name: string; email: string; accounts_hidden?: boolean }) => ({
    name:     m.name.trim(),
    email:    m.email,
    initials: buildInitials(m.name),
    accounts_hidden: m.accounts_hidden === true,
  }));

  return NextResponse.json({ members });
}
