import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { emailShell, heading, para, divider, ctaButton } from '@/lib/email-shell';
import { fetchAllRows } from '@/lib/crm';
import {
  dueReminder,
  priceFor,
  reminderField,
  today,
  type Membership,
  type ReminderStep,
} from '@/lib/membership';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';

/**
 * Il promemoria del rinnovo, una volta al giorno.
 *
 * Si manda a trenta giorni, a sette e il giorno stesso. Su ogni riga
 * resta scritto quale è già partito, quindi non se ne manda mai due
 * uguali — e se il sistema resta fermo una settimana, al ritorno manda
 * quello più vicino alla scadenza invece di tre mail in fila.
 *
 * Nessuna mail dopo la scadenza: a quel punto non è più un promemoria,
 * è insistenza. Chi è scaduto lo si vede nell'area riservata.
 */

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                'luglio','agosto','settembre','ottobre','novembre','dicembre'];
  return `${parseInt(d, 10)} ${mesi[parseInt(m, 10) - 1]} ${y}`;
}

function eur(cents: number) {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')} €`;
}

function buildEmail(m: Membership, step: ReminderStep) {
  const price = priceFor(m);
  const name = (m.full_name ?? '').trim().split(' ')[0] || 'ciao';

  const title =
    step === 0
      ? 'La tua tessera scade oggi'
      : step === 7
        ? 'La tua tessera scade fra una settimana'
        : 'È tempo di rinnovare';

  const body =
    step === 0
      ? `La tua tessera VIVO scade oggi, ${fmtDate(m.expires_at)}.`
      : `La tua tessera VIVO scade il ${fmtDate(m.expires_at)}.`;

  const offer = price.discounted
    ? para(
        `Rinnovando entro il ${fmtDate(m.offer_expires_at!)} paghi <strong>${eur(price.cents)}</strong> invece di ${eur(price.fullCents)}.`,
      )
    : para(`Il rinnovo per l'anno prossimo è di <strong>${eur(price.cents)}</strong>.`);

  return emailShell(
    [
      heading(title),
      para(`Ciao ${name},`),
      para(body),
      offer,
      divider(),
      ctaButton('Rinnova la tessera', 'https://vivowineclub.com/membership/rinnova'),
      para(
        m.member_id
          ? `La tua tessera è la ${m.member_id}.`
          : 'Se hai domande, rispondi pure a questa mail.',
      ),
    ].join(''),
  );
}

export async function GET(request: Request) {
  // Vercel firma le chiamate dei cron. In locale si lascia passare,
  // altrimenti non si potrebbe mai provarlo.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const now = today();

  try {
    const memberships = await fetchAllRows<Membership>(db, (q) =>
      q
        .from('memberships')
        .select('*')
        .is('cancelled_at', null)
        .order('expires_at', { ascending: true }),
    );

    const sent: string[] = [];
    const failed: string[] = [];

    for (const m of memberships) {
      const step = dueReminder(m, now);
      if (step === null) continue;

      try {
        const result = await resend.emails.send({
          from: FROM,
          replyTo: 'info@vivowineclub.com',
          to: [m.email],
          subject:
            step === 0
              ? 'La tua tessera VIVO scade oggi'
              : step === 7
                ? 'La tua tessera VIVO scade fra una settimana'
                : 'Rinnova la tua tessera VIVO',
          html: buildEmail(m, step),
        });
        if (result.error) throw new Error(result.error.message);

        // Si segna solo dopo che la mail è partita: segnarlo prima
        // significherebbe perdere il promemoria se l'invio fallisce.
        await db
          .from('memberships')
          .update({ [reminderField(step)]: new Date().toISOString() })
          .eq('id', m.id);

        sent.push(`${m.email} (${step}g)`);
      } catch (err) {
        console.error('[membership-reminder]', m.email, err);
        failed.push(m.email);
      }
    }

    return NextResponse.json({
      date: now,
      checked: memberships.length,
      sent: sent.length,
      failed: failed.length,
      detail: { sent, failed },
    });
  } catch (err) {
    console.error('[membership-reminder]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
