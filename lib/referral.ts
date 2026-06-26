/**
 * Shared referral code logic — used by both the generate endpoint
 * and the guests POST endpoint (inline generation).
 */
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const REWARD_THRESHOLD = 5; // unlock reward at 5 referrals

export function randomCode(prefix: string, len = 5): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix + '-';
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface ReferralResult {
  code:            string;
  uses:            number;
  reward_unlocked: boolean;
  reward_code:     string | null;
}

/**
 * Idempotent — returns existing code or creates a new one.
 * Returns null if referral tables don't exist (migration not applied yet).
 */
export async function generateReferralCode(opts: {
  email:        string;
  eventSlug:    string;
  name:         string;
  partnerCode?: string | null;
}): Promise<ReferralResult | null> {
  const { email, eventSlug, name, partnerCode } = opts;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  try {
    // Check for existing code
    const { data: existing, error: existErr } = await db
      .from('referral_codes')
      .select('code, uses, reward_unlocked, reward_code')
      .eq('event_slug', eventSlug)
      .eq('owner_email', email)
      .maybeSingle();

    // If table doesn't exist, existErr.code will be a PostgREST 404 — return null
    if (existErr) return null;

    if (existing) {
      return {
        code:            existing.code,
        uses:            existing.uses,
        reward_unlocked: existing.reward_unlocked,
        reward_code:     existing.reward_code ?? null,
      };
    }

    // Generate unique code (retry on collision)
    let code = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = randomCode('VIVO');
      const { data: collision } = await db
        .from('referral_codes')
        .select('id')
        .eq('code', candidate)
        .maybeSingle();
      if (!collision) { code = candidate; break; }
    }
    if (!code) return null;

    const { data: inserted, error: insertErr } = await db
      .from('referral_codes')
      .insert({ code, event_slug: eventSlug, owner_email: email, owner_name: name, partner_code: partnerCode ?? null })
      .select('code, uses, reward_unlocked, reward_code')
      .single();

    if (insertErr) return null;

    return {
      code:            inserted.code,
      uses:            inserted.uses,
      reward_unlocked: inserted.reward_unlocked,
      reward_code:     inserted.reward_code ?? null,
    };
  } catch {
    return null;
  }
}
