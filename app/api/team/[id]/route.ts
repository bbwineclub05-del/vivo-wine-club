import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';
import { isAdminEmail, SUPER_ADMIN_EMAIL } from '@/lib/admins';
import { computeBalances, formatEur, toCents, type Entry } from '@/lib/ledger';

async function assertSuperAdmin(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  // Team Management is board-only: staff can neither see it nor write to it.
  if (!isAdminEmail(auth.email)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true as const, email: auth.email };
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

// ── DELETE /api/team/[id] ────────────────────────────────────────────────────
/**
 * Toglie una persona dal club, davvero.
 *
 * Prima questa funzione cancellava la riga in `team_members` e metteva
 * a null il ruolo: l'account restava, la password restava valida, e al
 * caricamento successivo la sincronizzazione automatica rimetteva la
 * persona nell'elenco. Chi era stato "eliminato" ricompariva da solo.
 *
 * Adesso spariscono la riga, il profilo, la foto e le credenziali.
 * Restano i soldi e i biglietti: la storia contabile del club non si
 * riscrive perché qualcuno se ne va, e infatti se quella persona ha
 * una posizione aperta l'eliminazione si ferma qui e lo dice.
 */
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

  const { data: member } = await db
    .from('team_members')
    .select('id, email, name, auth_user_id')
    .eq('id', id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: 'Persona non trovata.' }, { status: 404 });

  const email = String(member.email ?? '').trim().toLowerCase();

  // Nessuno può cancellare sé stesso, e il super admin non si tocca:
  // è il pavimento sotto tutto il sistema dei permessi.
  if (email === check.email.toLowerCase()) {
    return NextResponse.json({ error: 'Non puoi eliminare te stesso.' }, { status: 400 });
  }
  if (email === SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Il super admin non si elimina.' }, { status: 400 });
  }

  // ── I soldi prima di tutto ──
  const { data: txs } = await db
    .from('transactions')
    .select('id, date, description, amount, entry_type, member_email, category')
    .eq('member_email', email);

  const entries: Entry[] = ((txs ?? []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id),
    date: String(t.date ?? ''),
    description: String(t.description ?? ''),
    amount_cents: toCents(t.amount as string | number) ?? 0,
    entry_type: (t.entry_type as Entry['entry_type']) ?? 'expense',
    member_email: (t.member_email as string | null) ?? null,
    category: (t.category as string | null) ?? null,
  }));

  const balance = computeBalances(entries).members[email] ?? 0;
  if (balance !== 0) {
    return NextResponse.json(
      {
        error:
          balance > 0
            ? `${member.name} ha ancora ${formatEur(balance)} da farsi rimborsare. Chiudi la posizione in Finance, poi elimina.`
            : `${member.name} deve ancora versare ${formatEur(-balance)} al club. Chiudi la posizione in Finance, poi elimina.`,
      },
      { status: 409 },
    );
  }

  const removed: string[] = [];

  // ── Le task assegnate restano al club, senza di lei ──
  const columns = 'id, assignee_email, assignee_emails, assigner_email';
  const [single, multi] = await Promise.all([
    db.from('tasks').select(columns).eq('assignee_email', email),
    db.from('tasks').select(columns).contains('assignee_emails', [email]),
  ]);
  const tasks = Object.values(
    Object.fromEntries(
      [...(single.data ?? []), ...(multi.data ?? [])].map((t: Record<string, unknown>) => [t.id, t]),
    ),
  ) as Record<string, unknown>[];

  // `assignee_email` non ammette null: una task deve avere un
  // responsabile. Quando la persona che se ne va era l'unica, la task
  // torna a chi l'aveva chiesta.
  let freed = 0;
  let stuck = 0;
  for (const t of tasks) {
    const others = ((t.assignee_emails as string[] | null) ?? []).filter(
      (e) => String(e).trim().toLowerCase() !== email,
    );
    const fallback = others[0] ?? (t.assigner_email as string | null) ?? null;
    if (!fallback) { stuck += 1; continue; }

    const { error } = await db
      .from('tasks')
      .update({
        assignee_emails: others.length > 0 ? others : [fallback],
        assignee_email:
          String(t.assignee_email ?? '').trim().toLowerCase() === email
            ? fallback
            : t.assignee_email,
      })
      .eq('id', t.id);
    if (error) stuck += 1;
    else freed += 1;
  }
  if (freed > 0) removed.push(`${freed} ${freed === 1 ? 'task riassegnata' : 'task riassegnate'}`);
  if (stuck > 0) {
    return NextResponse.json(
      {
        error: `${stuck} task restano intestate a ${member.name} e non hanno un altro responsabile. Riassegnale in Task, poi elimina.`,
      },
      { status: 409 },
    );
  }

  // ── Il profilo e la foto ──
  if (member.auth_user_id) {
    const { data: profile } = await db
      .from('profiles')
      .select('avatar_url')
      .eq('id', member.auth_user_id)
      .maybeSingle();

    const path = typeof profile?.avatar_url === 'string'
      ? profile.avatar_url.split('/avatars/')[1]
      : null;
    if (path) {
      await supabase.storage.from('avatars').remove([path]);
      removed.push('foto profilo');
    }

    await db.from('profiles').delete().eq('id', member.auth_user_id);
    removed.push('profilo');
  }

  // ── La riga nel team ──
  const { error: delErr } = await db.from('team_members').delete().eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  removed.push('accesso al pannello');

  // ── Le credenziali ──
  // Per ultimo, perché è l'unico passo che non si può annullare: se
  // qualcosa fallisce prima, l'account è ancora lì da cui ripartire.
  //
  // L'account si cerca anche per email: alcune righe — i collaboratori
  // di vecchia data — hanno un `auth_user_id` che non corrisponde più a
  // nessuno, e cercare solo per quello lasciava in piedi un account che
  // invece c'era, sotto un altro id.
  let authId: string | null = member.auth_user_id ?? null;
  if (!authId) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authId = data?.users?.find((u) => (u.email ?? '').toLowerCase() === email)?.id ?? null;
  }

  if (authId) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(authId);
    if (!authErr) {
      removed.push('credenziali');
    } else if (/not\s*found/i.test(authErr.message)) {
      // L'account non c'era già più: l'obiettivo è comunque raggiunto.
      // Prima questo caso veniva riportato come un errore, e i
      // collaboratori sembravano non eliminarsi mai pur essendo
      // spariti davvero.
      removed.push('credenziali (già assenti)');
    } else {
      return NextResponse.json(
        {
          error: `Riga rimossa, ma le credenziali di ${member.name} sono ancora attive: ${authErr.message}`,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, removed });
}
