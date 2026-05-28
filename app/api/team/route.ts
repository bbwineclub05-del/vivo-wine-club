import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';
import { isSuperAdmin, isAdminEmail, FOUNDERS } from '@/lib/admins';

const DEFAULT_PERMISSIONS = {
  tasks: true, events: true, news: true, crm: true,
  media: true, scanner: true, analytics: false, pipeline: false,
  merch: true, documents: true,
};

/** Name lookup: founders first, then user_metadata, then email prefix. */
const FOUNDER_NAME: Record<string, string> = Object.fromEntries(
  FOUNDERS.map((f) => [f.email, f.name]),
);

function resolveName(email: string, meta: Record<string, string> | null): string {
  return (
    FOUNDER_NAME[email] ??
    meta?.full_name ??
    meta?.name ??
    email.split('@')[0]
  );
}

async function assertSuperAdmin(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  if (!isSuperAdmin(auth.email)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true as const };
}

// ── GET /api/team ─────────────────────────────────────────────────────────────
// Lists ALL Supabase Auth users and auto-syncs them into team_members so the
// super-admin always sees a complete, up-to-date roster.
export async function GET(request: Request) {
  const check = await assertSuperAdmin(request);
  if (!check.ok) return check.response;

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Fetch all Auth users (up to 1 000)
  const { data: authData, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1, perPage: 1000,
  });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const authUsers = authData?.users ?? [];

  // 2. Fetch existing team_members rows
  const { data: existing } = await db.from('team_members').select('*');
  const existingByEmail = new Map<string, Record<string, unknown>>(
    (existing ?? []).map((m: Record<string, unknown>) => [m.email as string, m]),
  );

  // 3. Auto-insert Auth users not yet in team_members (ignoreDuplicates keeps existing data).
  // Skip users whose app_metadata.role is 'member' — they belong in the CRM, not the staff roster.
  const toInsert = authUsers
    .filter((u) => {
      if (!u.email) return false;
      if (existingByEmail.has(u.email)) return false;
      const authRole = (u.app_metadata as Record<string, string> | undefined)?.role;
      return authRole !== 'member';
    })
    .map((u) => {
      const authRole = (u.app_metadata as Record<string, string> | undefined)?.role;
      return {
        auth_user_id: u.id,
        email:        u.email!,
        name:         resolveName(u.email!, u.user_metadata as Record<string, string>),
        role:         isAdminEmail(u.email!) ? 'admin' : (authRole ?? 'staff'),
        permissions:  DEFAULT_PERMISSIONS,
        active:       true,
        invited_at:   u.created_at,
      };
    });

  if (toInsert.length > 0) {
    await db.from('team_members').upsert(toInsert, {
      onConflict:       'email',
      ignoreDuplicates: true,
    });
  }

  // 3b. Cleanup: remove any existing team_members rows whose auth role is 'member'.
  // These were incorrectly auto-synced from approved applications.
  const wronglyAddedEmails = authUsers
    .filter((u) => {
      const authRole = (u.app_metadata as Record<string, string> | undefined)?.role;
      return authRole === 'member' && u.email && existingByEmail.has(u.email);
    })
    .map((u) => u.email!);

  if (wronglyAddedEmails.length > 0) {
    await db.from('team_members').delete().in('email', wronglyAddedEmails);
  }

  // 4. Re-fetch the now-complete team_members list
  const { data: allMembers, error: fetchErr } = await db
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  // 5. Enrich each row with live auth metadata (confirmed status, last sign-in)
  const authByEmail = new Map(authUsers.map((u) => [u.email, u]));
  const enriched = (allMembers as Record<string, unknown>[]).map((m) => {
    const au = authByEmail.get(m.email as string);
    return {
      ...m,
      name:           m.name || resolveName(m.email as string, au?.user_metadata as Record<string, string> ?? null),
      email_confirmed: au?.email_confirmed_at != null,
      last_sign_in:    au?.last_sign_in_at ?? null,
    };
  });

  return NextResponse.json({ members: enriched });
}

// ── POST /api/team — invite a new user ───────────────────────────────────────
export async function POST(request: Request) {
  const check = await assertSuperAdmin(request);
  if (!check.ok) return check.response;

  const { name, email, role } = await request.json();
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'name, email e role sono obbligatori' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'staff') {
    return NextResponse.json({ error: 'role deve essere admin o staff' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Invite user — Supabase sends the set-password email automatically
  let authUserId: string | null = null;
  const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    data:       { name },
    redirectTo: 'https://vivowineclub.com/members?section=settings',
  });

  if (inviteErr) {
    if (inviteErr.message?.toLowerCase().includes('already')) {
      // Already registered — look up their ID
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });
      const found = usersData?.users?.find((u) => u.email === email);
      if (found) authUserId = found.id;
    } else {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }
  } else {
    authUserId = inviteData?.user?.id ?? null;
  }

  // Stamp app_metadata.role for API-level access
  if (authUserId) {
    await supabase.auth.admin.updateUserById(authUserId, {
      app_metadata: { role },
    });
  }

  // Upsert into team_members (handles re-inviting an existing row gracefully)
  const { data: member, error: upsertErr } = await db
    .from('team_members')
    .upsert({
      auth_user_id: authUserId,
      email,
      name,
      role,
      permissions:  DEFAULT_PERMISSIONS,
      active:       true,
      invited_at:   new Date().toISOString(),
    }, { onConflict: 'email' })
    .select()
    .single();

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, member });
}
