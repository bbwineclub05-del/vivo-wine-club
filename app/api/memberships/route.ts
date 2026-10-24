import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { membershipEmail, emailLocale } from '@/lib/emails/membership-emails';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';
import { generateMemberId, newMembershipFor, type Membership } from '@/lib/membership';
import { PRIVACY_POLICY_VERSION } from '@/lib/consent';

/**
 * Le tessere.
 *
 * `GET` è per l'area riservata: l'elenco con i pagamenti attaccati.
 * `POST` è pubblico: è l'iscrizione, e non c'è niente da approvare —
 * una tessera si compra. Durante il periodo gratuito la riga nasce già
 * valida; dal 2027 nasce in attesa del pagamento, e diventa valida
 * quando Stripe conferma.
 */

export const dynamic = 'force-dynamic';

/* ── GET — l'elenco, per l'area riservata ── */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const db = getSupabaseAdmin();

    const [memberships, payments] = await Promise.all([
      fetchAllRows<Membership>(db, (q) =>
        q.from('memberships').select('*').order('created_at', { ascending: false }),
      ),
      fetchAllRows<{ membership_id: string; amount_cents: number; status: string; period_end: string; paid_at: string | null }>(
        db,
        (q) => q.from('membership_payments').select('*').order('created_at', { ascending: true }),
      ),
    ]);

    const byMembership: Record<string, typeof payments> = {};
    for (const p of payments) (byMembership[p.membership_id] ??= []).push(p);

    return NextResponse.json({
      memberships: memberships.map((m) => ({ ...m, payments: byMembership[m.id] ?? [] })),
    });
  } catch (err) {
    console.error('[memberships GET]', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

/* ── POST — l'iscrizione, dal sito ── */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.full_name ?? '').trim();

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Serve un indirizzo email valido.' }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: 'Serve il nome.' }, { status: 400 });
    }
    if (body.consent_privacy !== true) {
      return NextResponse.json({ error: 'Serve il consenso alla privacy.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    // Una tessera per email: chi c'è già non ne prende una seconda.
    const { data: existing } = await db
      .from('memberships')
      .select('id, expires_at')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Questo indirizzo ha già una tessera.', alreadyMember: true },
        { status: 409 },
      );
    }

    const plan = newMembershipFor();

    // Il numero di tessera è casuale e la colonna è unica: una
    // collisione è improbabile ma non impossibile, e fallire
    // l'iscrizione di qualcuno per quello sarebbe assurdo.
    let inserted = null;
    let lastError = '';
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const { data, error } = await db
        .from('memberships')
        .insert({
          email,
          full_name: fullName,
          member_id: generateMemberId(),
          tier: plan.tier,
          started_at: plan.started_at,
          expires_at: plan.expires_at,
          standard_price_cents: plan.standard_price_cents,
          offer_price_cents: plan.offer_price_cents,
          offer_expires_at: plan.offer_expires_at,
          phone: String(body.phone ?? '').trim() || null,
          city: String(body.city ?? '').trim() || null,
          date_of_birth: String(body.date_of_birth ?? '').trim() || null,
          source: String(body.source ?? '').trim() || null,
          // La lingua del sito al momento dell'iscrizione: decide in
          // che lingua riceverà le mail, oggi e fra un anno.
          locale: emailLocale(body.locale),
          consent_marketing: body.consent_marketing === true,
          consent_privacy_accepted_at: new Date().toISOString(),
          consent_privacy_version: PRIVACY_POLICY_VERSION,
        })
        .select()
        .single();

      if (!error) inserted = data;
      else if (error.code === '23505' && error.message.includes('member_id')) lastError = error.message;
      else return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!inserted) {
      console.error('[memberships POST] member_id collisions', lastError);
      return NextResponse.json({ error: 'Riprova fra un istante.' }, { status: 503 });
    }

    // Il primo periodo: concesso se siamo nel gratuito, altrimenti in
    // attesa che Stripe confermi.
    await db.from('membership_payments').insert({
      membership_id: inserted.id,
      amount_cents: plan.dueNowCents,
      period_start: plan.started_at,
      period_end: plan.expires_at,
      status: plan.dueNowCents === 0 ? 'waived' : 'pending',
      paid_at: plan.dueNowCents === 0 ? new Date().toISOString() : null,
    });

    // Il benvenuto parte solo quando la tessera è già valida: se c'è
    // da pagare, la manda la conferma del pagamento. Un invio fallito
    // non deve far fallire l'iscrizione — la persona è socia comunque,
    // e la mail si può rimandare dall'area riservata.
    if (plan.dueNowCents === 0) {
      try {
        // Chi arriva dal modulo pubblico non sa ancora cosa sia VIVO:
        // la mail glielo racconta prima di elencare i vantaggi.
        const { subject, html } = membershipEmail('benvenuto', {
          fullName: inserted.full_name,
          memberId: inserted.member_id,
          expiresAt: inserted.expires_at,
          renewalCents: inserted.offer_price_cents ?? inserted.standard_price_cents,
          standardCents: inserted.standard_price_cents,
        }, inserted.locale);
        const { error: mailErr } = await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: 'Vivo Wine Club <noreply@vivowineclub.com>',
          to: inserted.email,
          subject,
          html,
        });
        if (!mailErr) {
          await db
            .from('memberships')
            .update({ welcome_sent_at: new Date().toISOString() })
            .eq('id', inserted.id);
        } else {
          console.error('[memberships POST] benvenuto non mandato:', mailErr.message);
        }
      } catch (e) {
        console.error('[memberships POST] benvenuto non mandato:', e);
      }
    }

    return NextResponse.json({
      membership: inserted,
      dueNowCents: plan.dueNowCents,
      memberId: inserted.member_id,
    });
  } catch (err) {
    console.error('[memberships POST]', err);
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
