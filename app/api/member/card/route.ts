import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateMemberId, tierLabel } from '@/lib/member-id';
import { FOUNDERS } from '@/lib/admins';

const FOUNDER_NAME: Record<string, string> = Object.fromEntries(
  FOUNDERS.map((f) => [f.email, f.name]),
);

/**
 * GET /api/member/card
 *
 * Returns the authenticated user's membership card data.
 * Generates and persists member_id, tier, and member_since on first call.
 *
 * Uses auth.getUser(token) directly — avoids the auth.admin namespace which
 * requires a second round-trip and can be unreliable on the shared singleton.
 */
export async function GET(request: Request) {
  const authHeader  = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Validate token + get full user in one call (includes app_metadata + created_at)
    const { data: { user }, error: userErr } = await supabase.auth.getUser(accessToken);

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role        = user.app_metadata?.role ?? user.user_metadata?.role ?? null;
    const tier        = tierLabel(role);
    const memberSince = new Date(user.created_at).getFullYear();
    const memberId    = generateMemberId(user.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Fetch display name from profile (may not exist yet)
    const { data: profile } = await db
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    // Founders/admins always show their real Nome Cognome on the card, never
    // a nickname set on their profile or auth metadata (e.g. "Pippo", "Cris").
    const founderName = user.email ? FOUNDER_NAME[user.email] : undefined;

    const name = founderName
      ?? profile?.full_name
      ?? user.user_metadata?.full_name
      ?? user.user_metadata?.name
      ?? user.email?.split('@')[0]
      ?? 'Vivo Member';

    // Persist card fields so the public share route can read them without
    // needing access to auth.admin. For founders this also self-heals
    // profiles.full_name if it was ever set to a nickname.
    await db.from('profiles').upsert(
      {
        id:           user.id,
        member_id:    memberId,
        tier,
        member_since: memberSince,
        updated_at:   new Date().toISOString(),
        ...(founderName ? { full_name: founderName } : {}),
      },
      { onConflict: 'id' },
    );

    return NextResponse.json({ memberId, name, tier, memberSince, avatarUrl: profile?.avatar_url ?? null });
  } catch (err) {
    console.error('[/api/member/card]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
