import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/card/[memberId]
 *
 * Public — no auth required.
 * Reads card data entirely from the profiles table (tier and member_since are
 * written there when the member first visits their card in the members area).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const { data: profile, error } = await db
      .from('profiles')
      .select('full_name, tier, member_since')
      .eq('member_id', memberId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({
      memberId,
      name:        profile.full_name ?? 'Vivo Member',
      tier:        profile.tier ?? 'Member',
      memberSince: profile.member_since ?? new Date().getFullYear(),
    });
  } catch (err) {
    console.error('[/api/card/[memberId]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
