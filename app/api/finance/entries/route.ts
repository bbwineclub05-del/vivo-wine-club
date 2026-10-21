import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { toCents, type EntryType } from '@/lib/ledger';

/**
 * Il registro.
 *
 * Le scritture passano di qui e non più dal browser: su dei soldi, chi
 * decide se una riga è valida deve stare dal lato che non si può
 * modificare con gli strumenti per sviluppatori.
 *
 * Mentre scrive, questa rotta tiene aggiornate anche le vecchie colonne
 * (`type`, `assigned_to`, `reimbursed_to`, `status`). Non servono più a
 * nessuno, ma finché esistono devono dire la verità: una colonna
 * lasciata indietro è una trappola per chi la leggerà fra sei mesi
 * credendola buona.
 */

export const dynamic = 'force-dynamic';

const TYPES: EntryType[] = ['expense', 'income', 'reimbursement', 'contribution'];

/** Le vecchie colonne, ricavate dalle nuove. */
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

/* ── GET — tutto il registro, più le categorie e i membri ── */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const [txRes, catRes, memRes] = await Promise.all([
    db.from('transactions').select('*').order('date', { ascending: false }),
    db.from('budget_categories').select('id, name, type').order('name'),
    db.from('team_members').select('name, email, active').order('name'),
  ]);

  if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 });

  return NextResponse.json({
    entries: txRes.data ?? [],
    categories: catRes.data ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members: (memRes.data ?? []).filter((m: any) => m.active !== false),
  });
}

/* ── POST — una riga nuova ── */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const entry_type = body.entry_type as EntryType;
    if (!TYPES.includes(entry_type)) {
      return NextResponse.json({ error: 'Tipo di movimento non valido.' }, { status: 400 });
    }

    const description = String(body.description ?? '').trim();
    if (!description) {
      return NextResponse.json({ error: 'Serve una causale.' }, { status: 400 });
    }

    // L'importo arriva come lo si è scritto ("12,50") e viene convertito
    // una volta sola, qui, in centesimi interi.
    const cents = toCents(body.amount ?? '');
    if (cents === null || cents <= 0) {
      return NextResponse.json({ error: 'L’importo deve essere maggiore di zero.' }, { status: 400 });
    }

    const date = String(body.date ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Data non valida.' }, { status: 400 });
    }

    const memberEmail: string | null = body.member_email || null;
    if ((entry_type === 'reimbursement' || entry_type === 'contribution') && !memberEmail) {
      return NextResponse.json(
        { error: 'Un rimborso o un versamento deve indicare la persona.' },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    // La persona deve esistere davvero: un'email scritta a mano che non
    // corrisponde a nessuno creerebbe un saldo fantasma che non si
    // chiuderà mai.
    let memberName: string | null = null;
    if (memberEmail) {
      const { data: m } = await db
        .from('team_members')
        .select('name')
        .eq('email', memberEmail)
        .maybeSingle();
      if (!m) {
        return NextResponse.json({ error: 'Persona non riconosciuta.' }, { status: 400 });
      }
      memberName = String(m.name).trim();
    }

    const { data, error } = await db
      .from('transactions')
      .insert({
        date,
        description,
        amount: cents / 100,
        entry_type,
        member_email: memberEmail,
        budget_category: body.category || null,
        category: body.category || 'Altro',
        notes: String(body.notes ?? '').trim() || null,
        status: 'confirmed',
        registered_by_name: auth.email,
        ...legacyShape(entry_type, memberName),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
