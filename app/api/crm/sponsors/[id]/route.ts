import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getSupabaseAdmin() as any;

/** Le colonne che si possono cambiare. `id` e `created_at` non si toccano. */
const WRITABLE = new Set([
  'name', 'email', 'phone', 'city', 'website', 'notes',
  'active', 'stage', 'owner_email', 'next_action_at',
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (WRITABLE.has(k)) patch[k] = v === '' ? null : v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Niente da aggiornare.' }, { status: 400 });
    }

    const { data, error } = await db()
      .from('sponsors')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sponsor: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const { error } = await db().from('sponsors').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
