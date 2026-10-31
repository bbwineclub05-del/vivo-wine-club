import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { generateMemberId, newMembershipFor } from '@/lib/membership';
import { membershipEmail } from '@/lib/emails/membership-emails';
import { preparaAccessoSocio } from '@/lib/member-access';

const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';

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
 *
 * E la mail parte subito. Prima no: la tessera si creava qui e il
 * benvenuto si mandava da un'altra scheda, due passaggi dove chi
 * attiva ne vede uno. Il risultato era una tessera attiva e una
 * persona che non sapeva niente, e su trentatré richieste sarebbe
 * successo trentatré volte senza che nessuno se ne accorgesse.
 *
 * Il testo è quello dell'attivazione, non il benvenuto: queste
 * persone si erano candidate mesi fa, e raccontargli il club da capo
 * come se fossero appena arrivate suonerebbe falso.
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

    // L'accesso e poi la mail. Se qualcosa va storto la tessera resta
    // (è già creata, e cancellarla per un invio fallito sarebbe
    // peggio): si dice com'è andata, e dalla scheda Tessere la mail si
    // può rimandare. `welcome_sent_at` resta vuoto, quindi si vede a
    // colpo d'occhio chi è rimasto senza.
    let avviso: string;
    try {
      const accesso = await preparaAccessoSocio(db, inserted.email, inserted.full_name);
      const { subject, html } = membershipEmail(
        'attivazione',
        {
          fullName: inserted.full_name,
          memberId: inserted.member_id,
          expiresAt: inserted.expires_at,
          renewalCents: inserted.offer_price_cents ?? inserted.standard_price_cents,
          standardCents: inserted.standard_price_cents,
          passwordLink: accesso.link,
          haPassword: accesso.haPassword,
        },
        inserted.locale,
      );

      const { error: mailErr } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: FROM,
        replyTo: 'info@vivowineclub.com',
        to: inserted.email,
        subject,
        html,
      });
      if (mailErr) throw new Error(mailErr.message);

      await db
        .from('memberships')
        .update({ welcome_sent_at: new Date().toISOString() })
        .eq('id', inserted.id);

      avviso = accesso.haPassword
        ? 'Tessera creata e mail mandata.'
        : 'Tessera creata e mail mandata, con il link per impostare la password.';
    } catch (e) {
      console.error('[memberships/from-application] mail non mandata:', e);
      avviso = `Tessera creata, ma la mail non è partita: ${
        e instanceof Error ? e.message : 'errore'
      }. Puoi rimandarla dalla scheda Tessere.`;
    }

    return NextResponse.json({ membership: inserted, avviso });
  } catch (err) {
    console.error('[memberships/from-application]', err);
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
