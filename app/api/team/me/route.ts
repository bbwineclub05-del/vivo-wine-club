import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';
import { isAdminEmail } from '@/lib/admins';

const FULL_PERMISSIONS = {
  tasks: true, events: true, news: true, crm: true,
  media: true, scanner: true, analytics: true, pipeline: true, merch: true, documents: true,
};

/**
 * GET /api/team/me
 * Returns the current user's team permissions.
 * Admins always receive full permissions.
 * Staff receive their row from team_members.
 */
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  if (isAdminEmail(auth.email)) {
    return NextResponse.json({ permissions: FULL_PERMISSIONS, active: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data } = await db
    .from('team_members')
    .select('permissions, active')
    .eq('email', auth.email)
    .maybeSingle();

  if (!data) {
    // Not in team_members — treat as no permissions
    return NextResponse.json({ permissions: {}, active: false });
  }

  return NextResponse.json({ permissions: data.permissions ?? {}, active: data.active });
}
