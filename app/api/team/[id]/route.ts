import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';
import { isSuperAdmin } from '@/lib/admins';

async function assertSuperAdmin(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  if (!isSuperAdmin(auth.email)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true as const };
}

// ── PATCH /api/team/[id] — update permissions, role, or active status ─────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await assertSuperAdmin(request);
  if (!check.ok) return check.response;

  const { id } = await params;
  const body = await request.json();
  // body may contain: permissions (partial), role, active, name
  const { permissions, role, active, name } = body;

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch current record to get auth_user_id and existing permissions
  const { data: current, error: fetchErr } = await db
    .from('team_members')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (name !== undefined)        updates.name   = name;
  if (role !== undefined)        updates.role   = role;
  if (active !== undefined)      updates.active = active;
  if (permissions !== undefined) {
    // Merge partial permissions with existing ones
    updates.permissions = { ...(current.permissions ?? {}), ...permissions };
  }

  const { data: updated, error: updateErr } = await db
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // If role changed or active changed → sync app_metadata in Supabase Auth
  if ((role !== undefined || active !== undefined) && current.auth_user_id) {
    const newRole   = role   ?? current.role;
    const newActive = active ?? current.active;
    await supabase.auth.admin.updateUserById(current.auth_user_id, {
      app_metadata: { role: newActive ? newRole : null },
    });
  }

  return NextResponse.json({ ok: true, member: updated });
}

// ── DELETE /api/team/[id] — remove member ─────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await assertSuperAdmin(request);
  if (!check.ok) return check.response;

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch to get auth_user_id before deleting
  const { data: current } = await db
    .from('team_members')
    .select('auth_user_id')
    .eq('id', id)
    .single();

  const { error } = await db.from('team_members').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove role from auth user so they lose staff access
  if (current?.auth_user_id) {
    await supabase.auth.admin.updateUserById(current.auth_user_id, {
      app_metadata: { role: null },
    });
  }

  return NextResponse.json({ ok: true });
}
