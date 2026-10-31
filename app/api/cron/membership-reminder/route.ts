import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { emailShell, heading, para, divider, ctaButton } from '@/lib/email-shell';
import { emailLocale, type EmailLocale } from '@/lib/emails/membership-emails';
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

/**
 * La data nella lingua di chi legge.
 *
 * `toLocaleDateString` gira anche sul server: i mesi scritti a mano in
 * italiano dentro una mail francese sono il dettaglio che fa capire
 * che la traduzione e' finta.
 */
function fmtDate(iso: string, locale: EmailLocale) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function eur(cents: number) {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')} €`;
}

/* I testi del promemoria. Prima era solo in italiano, anche per chi si
   era iscritto leggendo il sito in inglese o in francese: la lingua e'
   sulla riga della tessera da quando esiste, bastava usarla. */
const COPY: Record<EmailLocale, {
  oggetto: (step: ReminderStep) => string;
  titolo: (step: ReminderStep) => string;
  ciao: (n: string) => string;
  corpo: (step: ReminderStep, data: string) => string;
  conSconto: (data: string, sconto: string, pieno: string) => string;
  senzaSconto: (prezzo: string) => string;
  bottone: string;
  tessera: (id: string) => string;
  domande: string;
}> = {
  it: {
    oggetto: (s) => s === 0
      ? 'La tua tessera VIVO scade oggi'
      : s === 7 ? 'La tua tessera VIVO scade fra una settimana' : 'Rinnova la tua tessera VIVO',
    titolo: (s) => s === 0
      ? 'La tua tessera scade oggi'
      : s === 7 ? 'La tua tessera scade fra una settimana' : 'È tempo di rinnovare',
    ciao: (n) => `Ciao ${n},`,
    corpo: (s, data) => s === 0
      ? `La tua tessera VIVO scade oggi, ${data}.`
      : `La tua tessera VIVO scade il ${data}.`,
    conSconto: (data, sconto, pieno) =>
      `Rinnovando entro il ${data} paghi <strong>${sconto}</strong> invece di ${pieno}.`,
    senzaSconto: (prezzo) => `Il rinnovo per l’anno prossimo è di <strong>${prezzo}</strong>.`,
    bottone: 'Rinnova la tessera',
    tessera: (id) => `La tua tessera è la ${id}.`,
    domande: 'Se hai domande, rispondi pure a questa mail.',
  },
  en: {
    oggetto: (s) => s === 0
      ? 'Your VIVO membership expires today'
      : s === 7 ? 'Your VIVO membership expires in a week' : 'Time to renew your VIVO membership',
    titolo: (s) => s === 0
      ? 'Your membership expires today'
      : s === 7 ? 'Your membership expires in a week' : 'Time to renew',
    ciao: (n) => `Hi ${n},`,
    corpo: (s, data) => s === 0
      ? `Your VIVO membership expires today, ${data}.`
      : `Your VIVO membership expires on ${data}.`,
    conSconto: (data, sconto, pieno) =>
      `Renew by ${data} and you pay <strong>${sconto}</strong> instead of ${pieno}.`,
    senzaSconto: (prezzo) => `Next year’s renewal is <strong>${prezzo}</strong>.`,
    bottone: 'Renew your membership',
    tessera: (id) => `Your membership number is ${id}.`,
    domande: 'Any questions, just reply to this email.',
  },
  fr: {
    oggetto: (s) => s === 0
      ? 'Ta carte VIVO expire aujourd’hui'
      : s === 7 ? 'Ta carte VIVO expire dans une semaine' : 'C’est le moment de renouveler ta carte VIVO',
    titolo: (s) => s === 0
      ? 'Ta carte expire aujourd’hui'
      : s === 7 ? 'Ta carte expire dans une semaine' : 'C’est le moment de renouveler',
    ciao: (n) => `Salut ${n},`,
    corpo: (s, data) => s === 0
      ? `Ta carte VIVO expire aujourd’hui, ${data}.`
      : `Ta carte VIVO expire le ${data}.`,
    conSconto: (data, sconto, pieno) =>
      `En renouvelant avant le ${data}, tu paies <strong>${sconto}</strong> au lieu de ${pieno}.`,
    senzaSconto: (prezzo) => `Le renouvellement pour l’an prochain est de <strong>${prezzo}</strong>.`,
    bottone: 'Renouveler ma carte',
    tessera: (id) => `Ton numéro de carte est le ${id}.`,
    domande: 'Si tu as des questions, réponds simplement à cet e-mail.',
  },
};

function buildEmail(m: Membership, step: ReminderStep) {
  const locale = emailLocale(m.locale);
  const t = COPY[locale];
  const price = priceFor(m);
  const name = (m.full_name ?? '').trim().split(' ')[0] || (locale === 'it' ? 'ciao' : '');

  const offer = price.discounted
    ? para(t.conSconto(fmtDate(m.offer_expires_at!, locale), eur(price.cents), eur(price.fullCents)))
    : para(t.senzaSconto(eur(price.cents)));

  return {
    subject: t.oggetto(step),
    html: emailShell(
      [
        heading(t.titolo(step)),
        para(t.ciao(name)),
        para(t.corpo(step, fmtDate(m.expires_at, locale))),
        offer,
        divider(),
        ctaButton(t.bottone, 'https://vivowineclub.com/membership/rinnova'),
        para(m.member_id ? t.tessera(m.member_id) : t.domande),
      ].join(''),
    ),
  };
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
        const { subject, html } = buildEmail(m, step);
        const result = await resend.emails.send({
          from: FROM,
          replyTo: 'info@vivowineclub.com',
          to: [m.email],
          subject,
          html,
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
