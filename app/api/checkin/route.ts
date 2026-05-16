import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAdminEmail } from '@/lib/admins';

/**
 * POST /api/checkin
 * Body: { token: string }   — the raw qr_code value scanned from the ticket PDF
 * Headers: Authorization: Bearer <supabase_access_token>
 *
 * Atomically marks the ticket as checked_in using a single
 * UPDATE WHERE checked_in=false — prevents two admins scanning
 * simultaneously from both getting a "valid" response.
 */
export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const authHeader  = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } =
    await getSupabaseAdmin().auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role      = user.app_metadata?.role ?? user.user_metadata?.role;
  const userEmail = user.email ?? '';
  if (role !== 'staff' && !isAdminEmail(userEmail)) {
    return NextResponse.json({ error: 'Forbidden — staff or admin only' }, { status: 403 });
  }

  // ── Token ─────────────────────────────────────────────────────────────────────
  const body  = await request.json();
  const token = body?.token as string | undefined;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const db  = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const now = new Date().toISOString();
  const by  = user.email ?? user.id;

  // ── Atomic check-in ──────────────────────────────────────────────────────────
  // Try to update by qr_code first (new tickets), then by order_id (legacy).
  // The extra `.eq('checked_in', false)` condition makes this atomic:
  // if two admins scan simultaneously, only one UPDATE will match — the DB
  // enforces the mutual exclusion, no application-level race condition.
  for (const [col, val] of [['qr_code', token], ['order_id', token]] as const) {
    const { data: updated, error: updateErr } = await db
      .from('tickets')
      .update({ checked_in: true, scanned_at: now, scanned_by: by })
      .eq(col, val)
      .eq('checked_in', false)          // ← atomic: only wins if still unchecked
      .select('name, email, event_id')
      .maybeSingle();

    if (updateErr) {
      console.error('[checkin] update error:', updateErr);
      continue;
    }

    if (updated) {
      // This request won the race — ticket is now checked in.
      return NextResponse.json({
        valid:      true,
        buyerName:  updated.name,
        buyerEmail: updated.email,
        eventId:    updated.event_id,
        scannedAt:  now,
      });
    }
  }

  // ── Update matched nothing — either already checked in or token is unknown ────
  // Fetch the ticket to distinguish the two cases.
  let ticket: Record<string, unknown> | null = null;
  for (const [col, val] of [['qr_code', token], ['order_id', token]] as const) {
    const { data } = await db
      .from('tickets')
      .select('name, email, event_id, checked_in, scanned_at, scanned_by')
      .eq(col, val)
      .maybeSingle();
    if (data) { ticket = data; break; }
  }

  if (!ticket) {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }

  // Ticket exists but checked_in is already true.
  return NextResponse.json({
    valid:      false,
    reason:     'already_scanned',
    buyerName:  ticket.name,
    scannedAt:  ticket.scanned_at,
    scannedBy:  ticket.scanned_by,
    eventId:    ticket.event_id,
  });
}
