import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, requireAdminOrStaff } from '@/lib/auth-guard';
import { toCents, type EntryType } from '@/lib/ledger';

const TYPES: EntryType[] = ['expense', 'income', 'reimbursement', 'contribution'];

function legacyShape(entry_type: EntryType, memberName: string | null) {
  switch (entry_type) {
    case 'expense':
      return { type: 'cost', assigned_to: memberName ?? 'Club', reimbursed_to: null };
    case 'income':
      return { type: 'revenue', assigned_to: memberName ?? 'Club', reimbursed_to: null };
    case 'reimbursement':
      return { type: 'rimborso', assigned_to: 'Club', reimbursed_to: memberName };
    case 'contribution':
      return { type: 'revenue', assigned_to: 'Club', reimbursed_to: memberName };
  }
}

/* ── PATCH — correggere una riga ── */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const { data: current } = await db
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: 'Movimento non trovato.' }, { status: 404 });

    const entry_type: EntryType = body.entry_type ?? current.entry_type;
    if (!TYPES.includes(entry_type)) {
      return NextResponse.json({ error: 'Tipo di movimento non valido.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { entry_type };

    if (body.description !== undefined) {
      const d = String(body.description).trim();
      if (!d) return NextResponse.json({ error: 'Serve una causale.' }, { status: 400 });
      patch.description = d;
    }

    if (body.amount !== undefined) {
      const cents = toCents(body.amount);
      if (cents === null || cents <= 0) {
        return NextResponse.json({ error: 'L’importo deve essere maggiore di zero.' }, { status: 400 });
      }
      patch.amount = cents / 100;
    }

    if (body.date !== undefined) {
      const date = String(body.date).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Data non valida.' }, { status: 400 });
      }
      patch.date = date;
    }

    if (body.category !== undefined) {
      patch.budget_category = body.category || null;
      patch.category = body.category || 'Altro';
    }
    if (body.notes !== undefined) patch.notes = String(body.notes).trim() || null;

    const memberEmail =
      body.member_email !== undefined ? body.member_email || null : current.member_email;

    if ((entry_type === 'reimbursement' || entry_type === 'contribution') && !memberEmail) {
      return NextResponse.json(
        { error: 'Un rimborso o un versamento deve indicare la persona.' },
        { status: 400 },
      );
    }

    let memberName: string | null = null;
    if (memberEmail) {
      const { data: m } = await db
        .from('team_members')
        .select('name')
        .eq('email', memberEmail)
        .maybeSingle();
      if (!m) return NextResponse.json({ error: 'Persona non riconosciuta.' }, { status: 400 });
      memberName = String(m.name).trim();
    }
    patch.member_email = memberEmail;
    Object.assign(patch, legacyShape(entry_type, memberName));

    const { data, error } = await db
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

/**
 * DELETE — riservato al board.
 *
 * Cancellare una riga di denaro cambia la cassa e i saldi di tutti, e
 * non lascia traccia di sé: è l'unica azione della sezione che non si
 * può ricostruire guardando il registro.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const { error } = await db.from('transactions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
