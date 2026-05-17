import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';

// GET /api/team/members — returns name+email for all team members (any authenticated user)
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await db
    .from('team_members')
    .select('name, email')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}
