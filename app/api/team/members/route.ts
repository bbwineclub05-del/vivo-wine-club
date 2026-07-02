import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';

export interface TeamMember {
  name:     string;
  email:    string;
  initials: string;
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
  const { data, error } = await db
    .from('team_members')
    .select('name, email')
    .eq('active', true)
    .in('role', ['admin', 'staff'])
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members: TeamMember[] = (data ?? []).map((m: { name: string; email: string }) => ({
    name:     m.name.trim(),
    email:    m.email,
    initials: buildInitials(m.name),
  }));

  return NextResponse.json({ members });
}
