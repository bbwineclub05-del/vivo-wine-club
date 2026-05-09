import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/checkin
 * Body: { token: string }
 * Headers: Authorization: Bearer <supabase_access_token>
 *
 * Verifies the ticket token, marks it as scanned if valid.
 * Requires authenticated staff user (user_metadata.role === 'staff'
 * OR app_metadata.role === 'staff').
 */
export async function POST(request: Request) {
  // ── Auth: verify staff session ──────────────────────────────────────────────
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

  // ── Verify token ─────────────────────────────────────────────────────────────
  const body = await request.json();
  const token: string = body?.token;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Look up by qr_code first (new tickets), then fall back to order_id (legacy).
  let ticket: Record<string, unknown> | null = null;

  const { data: byQr, error: qrErr } = await db
    .from('tickets')
    .select('*')
    .eq('qr_code', token)
    .maybeSingle();

  if (!qrErr && byQr) {
    ticket = byQr;
  } else {
    const { data: byOrder, error: orderErr } = await db
      .from('tickets')
      .select('*')
      .eq('order_id', token)
      .maybeSingle();
    if (orderErr) {
      console.error('[checkin] DB error looking up ticket:', orderErr);
    }
    ticket = byOrder ?? null;
  }

  if (!ticket) {
    return NextResponse.json({ valid: false, reason: 'invalid' }, { status: 200 });
  }

  // ── Already scanned ──────────────────────────────────────────────────────────
  if (ticket.scanned) {
    return NextResponse.json({
      valid:       false,
      reason:      'already_scanned',
      scannedAt:   ticket.scanned_at,
      scannedBy:   ticket.scanned_by,
      buyerName:   ticket.buyer_name,
      eventId:     ticket.event_id,
      ticketCount: ticket.ticket_count,
    }, { status: 200 });
  }

  // ── Mark as scanned ──────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const orderId = ticket.order_id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdmin() as any)
    .from('tickets')
    .update({
      scanned:    true,
      scanned_at: now,
      scanned_by: user.email ?? user.id,
    })
    .eq('order_id', orderId);

  return NextResponse.json({
    valid:       true,
    buyerName:   ticket.buyer_name,
    buyerEmail:  ticket.buyer_email,
    eventId:     ticket.event_id,
    ticketCount: ticket.ticket_count,
    scannedAt:   now,
  }, { status: 200 });
}
