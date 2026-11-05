import { ctaButton, divider, emailShell, heading, para } from '@/lib/email-shell';
import { FREE_UNTIL, FOUNDING_OFFER_CENTS, STANDARD_PRICE_CENTS } from '@/lib/membership';
import { sintesiFor, type BenefitLocale } from '@/lib/member-benefits';

/**
 * «Vieni anche tu.»
 *
 * Non è una conferma né un promemoria: è l'unica mail del club che
 * parte verso qualcuno che non ci conosce ancora. Quindi dice tre
 * cose e si ferma — cos'è VIVO, cosa dà la tessera, e che oggi non
 * si paga — perché chi riceve un invito da uno sconosciuto legge due
 * righe, non dieci.
 *
 * I tre punti sono gli stessi della home, presi da dove stanno già:
 * se cambiano là cambiano qui, e il club non si racconta in due modi
 * diversi a seconda di dove lo si incontra.
 *
 * La lingua la sceglie chi invita, perché è l'unico che sa chi c'è
 * dall'altra parte: qui non abbiamo un profilo, un browser o una
 * cronologia da cui indovinarla, e indovinarla male a un invito è
 * peggio che a una ricevuta.
 */

export type LinguaInvito = BenefitLocale;

export const LINGUE_INVITO: { id: LinguaInvito; label: string }[] = [
  { id: 'it', label: 'Italiano' },
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
];

const TESTI: Record<LinguaInvito, {
  subject: string;
  titolo: string;
  sottotitolo: string;
  cosaSiamo: string;
  etichettaPunti: string;
  gratis: (data: string, offerta: string, pieno: string) => string;
  pulsante: string;
  firma: (chi: string) => string;
  congedo: string;
  locale: string;
}> = {
  it: {
    subject: 'Ti aspettiamo nel VIVO Wine Club',
    titolo: 'Ti aspettiamo nel club',
    sottotitolo: 'Un invito a diventare socio di VIVO Wine Club',
    cosaSiamo:
      'VIVO è il club di chi il vino lo beve senza farne una liturgia: serate, visite in cantina e viaggi, per una generazione a cui il vino è stato raccontato male.',
    etichettaPunti: 'Cosa dà la tessera',
    gratis: (data, offerta, pieno) =>
      `<strong style="color:#1a0505;" class="em-value">Adesso l’iscrizione è gratuita.</strong> Non si paga fino al ${data}: diventi socio oggi e lo sei per tutto il resto dell’anno. Chi entra adesso rinnova il 2027 a ${offerta} invece di ${pieno}.`,
    pulsante: 'DIVENTA SOCIO',
    firma: (chi) => `Ti ha invitato ${chi}.`,
    congedo: 'Se non ti interessa puoi ignorare questa mail: non te ne manderemo altre.',
    locale: 'it-IT',
  },
  en: {
    subject: 'An invitation to join VIVO Wine Club',
    titolo: 'Come and join us',
    sottotitolo: 'An invitation to become a member of VIVO Wine Club',
    cosaSiamo:
      'VIVO is the club for people who drink wine without the liturgy: nights, winery visits and trips, for a generation that has been told about wine badly.',
    etichettaPunti: 'What the membership gives you',
    gratis: (data, offerta, pieno) =>
      `<strong style="color:#1a0505;" class="em-value">Joining is free right now.</strong> There is nothing to pay until ${data}: become a member today and you are one for the rest of the year. Join now and you renew 2027 at ${offerta} instead of ${pieno}.`,
    pulsante: 'BECOME A MEMBER',
    firma: (chi) => `${chi} invited you.`,
    congedo: 'Not for you? Ignore this email — we will not send another.',
    locale: 'en-GB',
  },
  fr: {
    subject: 'Une invitation à rejoindre le VIVO Wine Club',
    titolo: 'On t’attend au club',
    sottotitolo: 'Une invitation à devenir membre du VIVO Wine Club',
    cosaSiamo:
      'VIVO, c’est le club de ceux qui boivent le vin sans en faire une liturgie : des soirées, des visites de domaines et des voyages, pour une génération à qui on a mal raconté le vin.',
    etichettaPunti: 'Ce que l’adhésion te donne',
    gratis: (data, offerta, pieno) =>
      `<strong style="color:#1a0505;" class="em-value">L’adhésion est gratuite en ce moment.</strong> Rien à payer jusqu’au ${data} : tu deviens membre aujourd’hui et tu l’es pour tout le reste de l’année. En entrant maintenant, tu renouvelles 2027 à ${offerta} au lieu de ${pieno}.`,
    pulsante: 'DEVENIR MEMBRE',
    firma: (chi) => `${chi} t’a invité.`,
    congedo: 'Si ça ne t’intéresse pas, ignore cet e-mail : nous n’en enverrons pas d’autre.',
    locale: 'fr-FR',
  },
};

function giorno(iso: string, locale: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function euro(cents: number): string {
  return `${cents / 100} €`;
}

export function invitoMembership(
  lingua: LinguaInvito = 'it',
  da?: string | null,
): { subject: string; html: string } {
  const c = TESTI[lingua] ?? TESTI.it;

  const punti = sintesiFor(lingua)
    .map(
      (v) => `
    <tr>
      <td style="padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3a1a1a;line-height:1.7;" class="em-p">
        <strong style="color:#1a0505;" class="em-value">${v.title}.</strong>
        <span style="color:#7a4a4a;" class="em-muted">${v.body}</span>
      </td>
    </tr>`,
    )
    .join('');

  // Chi ha premuto il pulsante, se lo sappiamo: un invito firmato da
  // una persona si legge diversamente da uno firmato da un indirizzo.
  const firma = da
    ? para(c.firma(da), 'text-align:center;font-size:12px;color:#7a4a4a;')
    : '';

  const body = `
${heading(c.titolo, c.sottotitolo)}

${para(c.cosaSiamo, 'text-align:center;')}

${divider()}

<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#731515;" class="em-label">${c.etichettaPunti}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  ${punti}
</table>

${divider()}

${para(
  c.gratis(giorno(FREE_UNTIL, c.locale), euro(FOUNDING_OFFER_CENTS), euro(STANDARD_PRICE_CENTS)),
  'text-align:center;',
)}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:26px 0 0;">
  <tr><td align="center">${ctaButton(c.pulsante, 'https://vivowineclub.com/membership')}</td></tr>
</table>

${firma}

${para(c.congedo, 'text-align:center;font-size:12px;color:#7a4a4a;')}`;

  return { subject: c.subject, html: emailShell(body) };
}
