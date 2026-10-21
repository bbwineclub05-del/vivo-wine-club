import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { generateMemberId, newMembershipFor } from '@/lib/membership';

/**
 * Crea una tessera da una delle vecchie richieste in archivio.
 *
 * Sono trentanove, arrivate quando il club valutava le iscrizioni una
 * per una. Non si convertono in blocco: alcune sono di mesi fa, e
 * regalare trentatré tessere senza guardarle è una decisione che
 * spetta a chi conosce quelle persone.
 *
 * La tessera nasce con le stesse regole di chi si iscrive oggi, e
 * resta scritto da quale richiesta è arrivata.
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const { applicationId } = await request.json();
    if (!applicationId) {
      return NextResponse.json({ error: 'Manca la richiesta.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const { data: app } = await db
      .from('applications')
      .select('id, name, email, phone, city, date_of_birth, source')
      .eq('id', applicationId)
      .maybeSingle();

    if (!app) return NextResponse.json({ error: 'Richiesta non trovata.' }, { status: 404 });

    const email = (app.email ?? '').trim().toLowerCase();
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'La richiesta non ha un indirizzo valido.' },
        { status: 400 },
      );
    }

    const { data: existing } = await db
      .from('memberships')
      .select('id, member_id')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Questa persona ha già la tessera ${existing.member_id}.` },
        { status: 409 },
      );
    }

    const plan = newMembershipFor();

    // Il numero di tessera è casuale su una colonna unica: una
    // collisione è improbabile, ma non deve far fallire l'operazione.
    let inserted = null;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const { data, error } = await db
        .from('memberships')
        .insert({
          email,
          full_name: (app.name ?? '').trim() || null,
          phone: app.phone ?? null,
          city: app.city ?? null,
          date_of_birth: app.date_of_birth ?? null,
          source: app.source ?? null,
          member_id: generateMemberId(),
          tier: plan.tier,
          started_at: plan.started_at,
          expires_at: plan.expires_at,
          standard_price_cents: plan.standard_price_cents,
          offer_price_cents: plan.offer_price_cents,
          offer_expires_at: plan.offer_expires_at,
          source_application_id: app.id,
        })
        .select()
        .single();

      if (!error) inserted = data;
      else if (!(error.code === '23505' && String(error.message).includes('member_id'))) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (!inserted) {
      return NextResponse.json({ error: 'Riprova fra un istante.' }, { status: 503 });
    }

    await db.from('membership_payments').insert({
      membership_id: inserted.id,
      amount_cents: plan.dueNowCents,
      period_start: plan.started_at,
      period_end: plan.expires_at,
      status: plan.dueNowCents === 0 ? 'waived' : 'pending',
      paid_at: plan.dueNowCents === 0 ? new Date().toISOString() : null,
    });

    return NextResponse.json({ membership: inserted });
  } catch (err) {
    console.error('[memberships/from-application]', err);
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
