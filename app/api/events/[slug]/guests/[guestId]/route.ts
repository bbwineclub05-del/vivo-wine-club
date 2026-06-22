import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

/* ── PATCH /api/events/[slug]/guests/[guestId]
   Body: { checked_in: boolean }
   Toggles check-in status for a single guest. ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; guestId: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { guestId } = await params;

  let body: { checked_in: boolean };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const db = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('event_guests')
    .update({ checked_in: body.checked_in })
    .eq('id', guestId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guest: data });
}
