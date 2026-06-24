import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/referral/status?code=VIVO-XXXXX
 * Public — returns current use count and reward status for a referral code.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') ?? '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const { data, error } = await db
    .from('referral_codes')
    .select('code, uses, reward_unlocked, reward_code, event_slug')
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    code:            data.code,
    uses:            data.uses,
    reward_unlocked: data.reward_unlocked,
    reward_code:     data.reward_code ?? null,
    event_slug:      data.event_slug,
  });
}
