import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { STAFF_NOTES_MAX, getApplicationType, isApplicationStatus } from '@/lib/applications';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/admin/applications/:type/:id
 * Body: { status?: 'pending' | 'accepted' | 'rejected', staff_notes?: string | null }
 *
 * accepted/rejected stamp reviewed_by (caller's email) + reviewed_at; going
 * back to pending clears them. No email is sent to the applicant.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { type: typeKey, id } = await params;
  const type = getApplicationType(typeKey);
  if (!type) return NextResponse.json({ error: 'Unknown application type' }, { status: 400 });
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };

  if ('status' in input) {
    if (!isApplicationStatus(input.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = input.status;
    const reviewed = input.status !== 'pending';
    update.reviewed_by = reviewed ? auth.email : null;
    update.reviewed_at = reviewed ? now : null;
  }

  if ('staff_notes' in input) {
    const notes = input.staff_notes;
    if (notes !== null && typeof notes !== 'string') {
      return NextResponse.json({ error: 'Invalid staff_notes' }, { status: 400 });
    }
    const trimmed = typeof notes === 'string' ? notes.trim() : '';
    if (trimmed.length > STAFF_NOTES_MAX) {
      return NextResponse.json({ error: 'staff_notes too long' }, { status: 400 });
    }
    update.staff_notes = trimmed || null;
  }

  if (!('status' in update) && !('staff_notes' in update)) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await db
    .from(type.table)
    .update(update)
    .eq('id', id)
    .select(type.columns.join(','))
    .maybeSingle();

  if (error) {
    console.error(`[admin/applications] update error (${type.key}):`, error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  return NextResponse.json({ application: data });
}
