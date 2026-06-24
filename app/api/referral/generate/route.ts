import { NextResponse } from 'next/server';
import { generateReferralCode } from '@/lib/referral';

/**
 * POST /api/referral/generate
 * Body: { email, event_slug, name }
 * Idempotent — returns existing code if already generated.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email     = String(body.email      ?? '').trim().toLowerCase();
  const eventSlug = String(body.event_slug ?? '').trim();
  const name      = String(body.name       ?? '').trim();

  if (!email || !eventSlug) {
    return NextResponse.json({ error: 'email and event_slug required' }, { status: 422 });
  }

  const result = await generateReferralCode({ email, eventSlug, name });
  if (!result) {
    return NextResponse.json({ error: 'Referral tables not available' }, { status: 503 });
  }

  return NextResponse.json(result);
}
