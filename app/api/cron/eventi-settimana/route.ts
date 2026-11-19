import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { emailShell, heading, para, divider, ctaButton } from '@/lib/email-shell';
import { emailLocale, type EmailLocale } from '@/lib/emails/membership-emails';
import { fetchAllRows } from '@/lib/crm';
import type { Membership } from '@/lib/membership';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';
const SITO = 'https://vivowineclub.com';
/** Dove si segna l'ultimo invio, per non farne due nella stessa settimana. */
const CHIAVE = 'eventi_settimana_ultimo_invio';

/**
 * Gli eventi della settimana, ai soci, il lunedi' mattina.
 *
 * Una sola regola fa tutto il lavoro: se nei prossimi sette giorni non
 * c'e' niente, la mail non parte. Una newsletter che arriva comunque,
 * per dire che non c'e' nulla da dire, insegna ad archiviarla senza
 * aprirla — e la settimana in cui invece c'e' qualcosa, non la apre
 * piu' nessuno.
 *
 * Ogni evento e' un collegamento alla sua pagina: chi legge arriva
 * dove si prenota, non su un elenco da cui ricominciare a cercare.
 */

interface Evento {
  slug: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  location_short: string | null;
  status: string | null;
  members_only: boolean | null;
}

/* ── Date ──────────────────────────────────────────────────────── */

/** Oggi in Italia. Il server sta altrove, e a mezzanotte la
 *  differenza fra i due fusi sposta la settimana di un giorno. */
function oggiRoma() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
}

function piuGiorni(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function quandoLeggibile(iso: string, ora: string | null, locale: EmailLocale) {
  const giorno = new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  return ora ? `${giorno} · ${ora.slice(0, 5)}` : giorno;
}

/* ── Testi ─────────────────────────────────────────────────────── */

const COPY: Record<EmailLocale, {
  oggetto: (n: number) => string;
  titolo: string;
  ciao: (nome: string) => string;
  intro: (n: number) => string;
  vedi: string;
  soloSoci: string;
  esaurito: string;
  bottone: string;
  chiusura: string;
}> = {
  it: {
    oggetto: (n) => (n === 1 ? 'Questa settimana al club: un evento' : `Questa settimana al club: ${n} eventi`),
    titolo: 'Questa settimana al club',
    ciao: (nome) => (nome ? `Ciao ${nome},` : 'Ciao,'),
    intro: (n) => (n === 1
      ? 'C’è un evento in programma nei prossimi giorni.'
      : `Ci sono ${n} eventi in programma nei prossimi giorni.`),
    vedi: 'Vedi l’evento',
    soloSoci: 'Solo soci',
    esaurito: 'Esaurito',
    bottone: 'Tutti gli eventi',
    chiusura: 'Ci vediamo lì. Per qualsiasi cosa, rispondi pure a questa mail.',
  },
  en: {
    oggetto: (n) => (n === 1 ? 'This week at the club: one event' : `This week at the club: ${n} events`),
    titolo: 'This week at the club',
    ciao: (nome) => (nome ? `Hi ${nome},` : 'Hi,'),
    intro: (n) => (n === 1
      ? 'There is one event coming up in the next few days.'
      : `There are ${n} events coming up in the next few days.`),
    vedi: 'See the event',
    soloSoci: 'Members only',
    esaurito: 'Sold out',
    bottone: 'All the events',
    chiusura: 'See you there. Anything you need, just reply to this email.',
  },
  fr: {
    oggetto: (n) => (n === 1 ? 'Cette semaine au club : un événement' : `Cette semaine au club : ${n} événements`),
    titolo: 'Cette semaine au club',
    ciao: (nome) => (nome ? `Salut ${nome},` : 'Salut,'),
    intro: (n) => (n === 1
      ? 'Il y a un événement dans les prochains jours.'
      : `Il y a ${n} événements dans les prochains jours.`),
    vedi: 'Voir l’événement',
    soloSoci: 'Réservé aux membres',
    esaurito: 'Complet',
    bottone: 'Tous les événements',
    chiusura: 'On s’y retrouve. Pour toute question, réponds simplement à cet e-mail.',
  },
};

/* ── Un evento, come blocco ────────────────────────────────────── */

/**
 * Tutto il blocco e' un collegamento, non solo il titolo: su un
 * telefono un bersaglio grande come il riquadro si prende al primo
 * colpo, e una riga di testo sottolineata no.
 */
function blocco(e: Evento, locale: EmailLocale) {
  const t = COPY[locale];
  const url = `${SITO}/events/${e.slug}`;
  const dove = e.location_short || e.location || '';

  const etichette = [
    e.members_only ? t.soloSoci : null,
    e.status === 'soldout' ? t.esaurito : null,
  ].filter(Boolean) as string[];

  const riga = etichette.length
    ? `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8a5a5a;" class="em-muted">${etichette.join(' · ')}</p>`
    : '';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0 0;">
  <tr>
    <td style="border:1px solid #eddada;border-radius:6px;padding:18px 20px;" class="em-card">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a5a5a;" class="em-muted">${quandoLeggibile(e.date, e.time, locale)}</p>
      <p style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.35;color:#1a0505;" class="em-h1">
        <a href="${url}" target="_blank" style="color:#1a0505;text-decoration:none;" class="em-h1">${e.title}</a>
      </p>
      ${dove ? `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3a1a1a;line-height:1.6;" class="em-p">${dove}</p>` : ''}
      ${riga}
      <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;">
        <a href="${url}" target="_blank" style="color:#6b1a1a;text-decoration:none;" class="em-link">${t.vedi} &rarr;</a>
      </p>
    </td>
  </tr>
</table>`;
}

function costruisci(m: Membership, eventi: Evento[]) {
  const locale = emailLocale(m.locale);
  const t = COPY[locale];
  const nome = (m.full_name ?? '').trim().split(' ')[0] || '';

  return {
    subject: t.oggetto(eventi.length),
    html: emailShell(
      [
        heading(t.titolo),
        para(t.ciao(nome)),
        para(t.intro(eventi.length)),
        eventi.map((e) => blocco(e, locale)).join(''),
        divider('28px 0'),
        ctaButton(t.bottone, `${SITO}/events`),
        para(t.chiusura, 'text-align:center;'),
      ].join(''),
    ),
  };
}

/* ── L'invio ───────────────────────────────────────────────────── */

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  /* Una prova mostra cosa partirebbe senza far partire niente: una
     mail a sessanta persone non si collauda mandandola. */
  const prova = url.searchParams.get('prova') === '1';
  const forza = url.searchParams.get('forza') === '1';
  /* La finestra e' di sette giorni. Si puo' allargare dall'indirizzo,
     e serve soprattutto per guardare la mail quando la settimana e'
     vuota: senza, l'unico modo di vederla sarebbe aspettare. */
  const giorniChiesti = Number(url.searchParams.get('giorni'));
  const giorni = Number.isInteger(giorniChiesti) && giorniChiesti >= 1 && giorniChiesti <= 31
    ? giorniChiesti
    : 7;
  /* Una prova vera, a un indirizzo solo. La mail e' identica a quella
     che riceveranno tutti: provarla su una copia semplificata vuol
     dire non averla provata. Non conta come invio della settimana. */
  const solo = (url.searchParams.get('solo') ?? '').trim().toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const oggi = oggiRoma();
  const fine = piuGiorni(oggi, giorni - 1);

  try {
    const { data: righe, error } = await db
      .from('events')
      .select('slug,title,date,time,location,location_short,status,members_only')
      .eq('published', true)
      .gte('date', oggi)
      .lte('date', fine)
      /* Un evento di cui si conosce solo il mese non e' "questa
         settimana": la sua data e' un segnaposto. */
      .eq('date_month_only', false)
      .neq('status', 'completed')
      .order('date', { ascending: true })
      .order('time', { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);

    const eventi = (righe ?? []) as Evento[];
    if (eventi.length === 0) {
      return NextResponse.json({
        da: oggi, a: fine, eventi: 0, inviate: 0,
        nota: 'Nessun evento in settimana: nessuna mail.',
      });
    }

    /* Due mail uguali nella stessa settimana sono peggio di nessuna:
       la riga dice quando e' partita l'ultima. */
    const { data: segno } = await db
      .from('settings').select('value').eq('key', CHIAVE).maybeSingle();
    if (!prova && !forza && segno?.value && segno.value >= piuGiorni(oggi, -6)) {
      return NextResponse.json({
        da: oggi, a: fine, eventi: eventi.length, inviate: 0,
        nota: `Gia' inviata il ${segno.value}.`,
      });
    }

    /* I soci in regola: tessera non disdetta e non scaduta. Chi e'
       scaduto non riceve il calendario dei soci. */
    const soci = (await fetchAllRows<Membership>(db, (q) =>
      q.from('memberships').select('*').is('cancelled_at', null),
    )).filter((m) => m.expires_at >= oggi && !!m.email);

    /* Una persona, una mail: la stessa casella puo' comparire su due
       tessere, e due copie della stessa newsletter sembrano un errore
       del sito. */
    const visti = new Set<string>();
    let destinatari = soci.filter((m) => {
      const k = m.email.trim().toLowerCase();
      if (visti.has(k)) return false;
      visti.add(k);
      return true;
    });

    if (solo) {
      const suo = destinatari.find((m) => m.email.trim().toLowerCase() === solo);
      destinatari = suo
        ? [suo]
        /* Non e' socio: la mail parte lo stesso, con la lingua e il
           nome che il sistema userebbe per uno sconosciuto. */
        : [{ email: solo, full_name: null, locale: null } as unknown as Membership];
    }

    if (prova) {
      const esempio = destinatari[0];
      /* La mail vera, da guardare con gli occhi: un elenco di titoli
         in JSON non dice se il blocco di un evento sta in piedi. */
      if (url.searchParams.get('html') === '1' && esempio) {
        return new NextResponse(costruisci(esempio, eventi).html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return NextResponse.json({
        da: oggi, a: fine, prova: true,
        eventi: eventi.map((e) => ({ data: e.date, titolo: e.title, link: `${SITO}/events/${e.slug}` })),
        destinatari: destinatari.length,
        oggetto: esempio ? costruisci(esempio, eventi).subject : null,
      });
    }

    const inviate: string[] = [];
    const fallite: string[] = [];

    for (const m of destinatari) {
      try {
        const { subject, html } = costruisci(m, eventi);
        const res = await resend.emails.send({
          from: FROM,
          replyTo: 'info@vivowineclub.com',
          to: [m.email],
          subject,
          html,
        });
        if (res.error) throw new Error(res.error.message);
        inviate.push(m.email);
      } catch (err) {
        console.error('[eventi-settimana]', m.email, err);
        fallite.push(m.email);
      }
    }

    // Si segna solo se qualcosa e' davvero partito, e mai per una
    // prova a un indirizzo solo: la settimana vera deve ancora venire.
    if (inviate.length > 0 && !solo) {
      await db.from('settings').upsert({
        key: CHIAVE, value: oggi, updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      da: oggi, a: fine,
      eventi: eventi.length,
      destinatari: destinatari.length,
      inviate: inviate.length,
      fallite: fallite.length,
      dettaglio: { fallite },
    });
  } catch (err) {
    console.error('[eventi-settimana]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
