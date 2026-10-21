import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

/** Le colonne che si possono cambiare dall'area riservata. */
const WRITABLE = new Set([
  'first_name', 'last_name', 'phone', 'city', 'country',
  'company', 'role', 'website', 'instagram', 'tiktok', 'followers',
  'message', 'stage', 'owner_email', 'next_action_at', 'notes',
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(body)) {
      if (WRITABLE.has(k)) patch[k] = v === '' ? null : v;
    }
    if (Object.keys(patch).length === 1) {
      return NextResponse.json({ error: 'Niente da aggiornare.' }, { status: 400 });
    }

    const { data, error } = await db()
      .from('collaboration_applications')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ application: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

/** Eliminare una candidatura cancella una persona che si era proposta. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { error } = await db().from('collaboration_applications').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
