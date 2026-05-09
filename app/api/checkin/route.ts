import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/checkin
 * Body: { token: string }   — the raw qr_code value scanned from the ticket PDF
 * Headers: Authorization: Bearer <supabase_access_token>
 *
 * Looks up the ticket by qr_code (or order_id for legacy tickets),
 * marks checked_in = true if valid and not already used.
 * Requires authenticated staff user (app_metadata.role === 'staff').
 */
export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 });
  }

  // ── Token ─────────────────────────────────────────────────────────────────────
  const body = await request.json();
  const token: string = body?.token;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Look up by qr_code first (all new tickets), fall back to order_id (legacy).
  let ticket: Record<string, unknown> | null = null;

  const { data: byQr } = await db
    .from('tickets')
    .select('*')
    .eq('qr_code', token)
    .maybeSingle();

  if (byQr) {
    ticket = byQr;
  } else {
    const { data: byOrder, error: orderErr } = await db
      .from('tickets')
      .select('*')
      .eq('order_id', token)
      .maybeSingle();
    if (orderErr) console.error('[checkin] DB lookup error:', orderErr);
    ticket = byOrder ?? null;
  }

  if (!ticket) {
    return NextResponse.json({ valid: false, reason: 'invalid' }, { status: 200 });
  }

  // ── Already checked in ───────────────────────────────────────────────────────
  if (ticket.checked_in) {
    return NextResponse.json({
      valid:       false,
      reason:      'already_scanned',
      scannedAt:   ticket.scanned_at,
      scannedBy:   ticket.scanned_by,
      buyerName:   ticket.name,
      eventId:     ticket.event_id,
    }, { status: 200 });
  }

  // ── Mark as checked in ───────────────────────────────────────────────────────
  const now     = new Date().toISOString();
  const orderId = ticket.order_id as string;

  const { error: updateErr } = await db
    .from('tickets')
    .update({
      checked_in: true,
      scanned_at: now,
      scanned_by: user.email ?? user.id,
    })
    .eq('order_id', orderId);

  if (updateErr) {
    console.error('[checkin] Update error:', updateErr);
    return NextResponse.json({ error: 'Failed to mark ticket' }, { status: 500 });
  }

  return NextResponse.json({
    valid:      true,
    buyerName:  ticket.name,
    buyerEmail: ticket.email,
    eventId:    ticket.event_id,
    scannedAt:  now,
  }, { status: 200 });
}
