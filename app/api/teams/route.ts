import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const [teamsRes, membersRes] = await Promise.all([
      db.from('teams').select('*').order('name', { ascending: true }),
      db.from('team_members_tasks').select('team_id, user_email'),
    ]);

    if (teamsRes.error) return NextResponse.json({ error: teamsRes.error.message }, { status: 500 });

    const membersByTeam: Record<string, string[]> = {};
    for (const row of (membersRes.data ?? [])) {
      if (!membersByTeam[row.team_id]) membersByTeam[row.team_id] = [];
      membersByTeam[row.team_id].push(row.user_email);
    }

    const teams = (teamsRes.data ?? []).map((t: any) => ({
      id:          t.id,
      name:        t.name,
      color:       t.color ?? '#731515',
      description: t.description ?? null,
      created_at:  t.created_at,
      members:     membersByTeam[t.id] ?? [],
    }));

    return NextResponse.json({ teams });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
