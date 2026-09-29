import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

/**
 * POST /api/crm/categories/[id]/contacts/mark-reminded
 * Body: { emails: string[] }
 *
 * Stamps last_reminder_sent_at=now() on every contact row in this category
 * whose email matches (case-insensitive) one of the given addresses — a
 * person can have several rows (one per event ticket), and all of them must
 * reflect the same "last reminded" timestamp, not just one.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const emails = Array.isArray(body.emails) ? (body.emails as unknown[]).map(String) : [];

  if (emails.length === 0) {
    return NextResponse.json({ error: 'emails is required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // crm_custom_contacts has no case-insensitive multi-match in a single call,
  // so update per distinct email (category is small — a handful of API calls).
  const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];
  let updated = 0;

  for (const email of uniqueEmails) {
    const { data, error } = await db()
      .from('crm_custom_contacts')
      .update({ last_reminder_sent_at: now })
      .eq('category_id', id)
      .ilike('email', email)
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updated += data?.length ?? 0;
  }

  return NextResponse.json({ ok: true, updated, last_reminder_sent_at: now });
}
