import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

/**
 * GET /api/events/[slug]/participants
 * Returns the unique set of participant emails for an event,
 * combining both event_guests (invite-only) and tickets (paid).
 * Used by EventInviteModal to filter CRM customers by past event attendance.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const [guestsRes, ticketsRes] = await Promise.all([
    db.from('event_guests').select('email').eq('event_slug', slug),
    db.from('tickets').select('email').eq('event_id', slug).eq('payment_status', 'paid'),
  ]);

  const emails = new Set<string>();
  for (const row of (guestsRes.data ?? []) as Array<{ email: string }>) {
    if (row.email) emails.add(row.email.toLowerCase());
  }
  for (const row of (ticketsRes.data ?? []) as Array<{ email: string }>) {
    if (row.email) emails.add(row.email.toLowerCase());
  }

  return NextResponse.json({ emails: Array.from(emails) });
}
