import { Resend } from 'resend';
import { emailShell } from '@/lib/email-shell';
import { emailLocale, type EmailLocale } from '@/lib/emails/membership-emails';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = 'Vivo Wine Club <info@vivowineclub.com>';
const A_NOI = 'info@vivowineclub.com';

export interface MerchOrderItem { name: string; qty: number; price: number }

/**
 * Le mail dello shop.
 *
 * Tre: la conferma a chi ha comprato, l'avviso di spedizione, e
 * l'avviso a noi che c'e' un ordine da preparare. Quest'ultimo non
 * c'era: i biglietti ci arrivavano in casella e la merce no, quindi
 * una felpa venduta si scopriva aprendo il pannello.
 *
 * Le due mail al cliente parlano la sua lingua. La conferma la sa con
 * certezza, perche' la lingua del sito viaggia nei dati della
 * sessione di pagamento. La spedizione parte giorni dopo, da una
 * persona che clicca nel pannello, e a quel punto l'unico indizio
 * rimasto e' il paese di consegna: e' un'approssimazione, ma e'
 * meglio che scrivere a tutti in italiano.
 */

/* ── I testi ──────────────────────────────────────────────────────── */

const COPY: Record<EmailLocale, {
  spedizione: string;
  totale: string;
  confermaOggetto: string;
  confermaTitolo: (nome: string | null) => string;
  confermaCorpo: string;
  spedizioneOggetto: string;
  spedizioneTitolo: (nome: string | null) => string;
  spedizioneCorpo: string;
  datiSpedizione: string;
  corriere: string;
  codice: string;
  traccia: string;
  destinazione: string;
  bottoneTraccia: string;
  domande: string;
}> = {
  it: {
    spedizione: 'Spedizione',
    totale: 'TOTALE',
    confermaOggetto: 'Il tuo ordine Vivo Wine Club: conferma ricevuta',
    confermaTitolo: (n) => `Grazie per il tuo ordine${n ? `, ${n}` : ''}!`,
    confermaCorpo:
      'Abbiamo ricevuto il tuo ordine e lo stiamo preparando. Riceverai un’altra email non ' +
      'appena verrà spedito.',
    spedizioneOggetto: 'Vivo Wine Club: il tuo ordine è stato spedito',
    spedizioneTitolo: (n) => `Il tuo ordine è in arrivo${n ? `, ${n}` : ''}!`,
    spedizioneCorpo: 'Abbiamo spedito il tuo ordine. Il pacco sarà da te presto.',
    datiSpedizione: 'DATI SPEDIZIONE',
    corriere: 'Corriere',
    codice: 'Codice tracciamento',
    traccia: 'Traccia il pacco',
    destinazione: 'Destinazione',
    bottoneTraccia: 'TRACCIA IL TUO PACCO',
    domande: 'Per qualsiasi domanda scrivici a',
  },
  en: {
    spedizione: 'Shipping',
    totale: 'TOTAL',
    confermaOggetto: 'Your Vivo Wine Club order: confirmed',
    confermaTitolo: (n) => `Thank you for your order${n ? `, ${n}` : ''}!`,
    confermaCorpo:
      'We’ve received your order and we’re getting it ready. You’ll get another email as soon ' +
      'as it ships.',
    spedizioneOggetto: 'Vivo Wine Club: your order has shipped',
    spedizioneTitolo: (n) => `Your order is on its way${n ? `, ${n}` : ''}!`,
    spedizioneCorpo: 'We’ve shipped your order. The parcel will be with you soon.',
    datiSpedizione: 'SHIPPING DETAILS',
    corriere: 'Carrier',
    codice: 'Tracking number',
    traccia: 'Track the parcel',
    destinazione: 'Destination',
    bottoneTraccia: 'TRACK YOUR PARCEL',
    domande: 'Any questions, write to us at',
  },
  fr: {
    spedizione: 'Livraison',
    totale: 'TOTAL',
    confermaOggetto: 'Ta commande Vivo Wine Club : confirmée',
    confermaTitolo: (n) => `Merci pour ta commande${n ? `, ${n}` : ''} !`,
    confermaCorpo:
      'Nous avons reçu ta commande et nous la préparons. Tu recevras un autre e-mail dès ' +
      'qu’elle sera expédiée.',
    spedizioneOggetto: 'Vivo Wine Club : ta commande est expédiée',
    spedizioneTitolo: (n) => `Ta commande arrive${n ? `, ${n}` : ''} !`,
    spedizioneCorpo: 'Nous avons expédié ta commande. Le colis sera bientôt chez toi.',
    datiSpedizione: 'DÉTAILS DE LIVRAISON',
    corriere: 'Transporteur',
    codice: 'Numéro de suivi',
    traccia: 'Suivre le colis',
    destinazione: 'Destination',
    bottoneTraccia: 'SUIVRE TON COLIS',
    domande: 'Pour toute question, écris-nous à',
  },
};

/**
 * La lingua da usare partendo dal paese di consegna.
 *
 * Serve solo alla mail di spedizione, che parte giorni dopo l'acquisto
 * e non ha piu' sotto mano la lingua del sito. Fuori da Italia e
 * Francia si scrive in inglese, che e' la scelta meno sbagliata.
 */
export function linguaDalPaese(paese: string | null | undefined): EmailLocale {
  const p = (paese ?? '').trim().toUpperCase();
  if (p === 'IT') return 'it';
  if (p === 'FR' || p === 'BE' || p === 'LU' || p === 'MC') return 'fr';
  return 'en';
}

// ── Righe degli articoli, condivise ──────────────────────────────────────────

function itemRows(items: MerchOrderItem[]) {
  return items.map(item => `
    <tr>
      <td style="padding:9px 0;font-family:sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;">
        <span style="font-weight:600;">${item.qty}&times;</span> ${item.name}
      </td>
      <td style="padding:9px 0;font-family:sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;text-align:right;white-space:nowrap;">
        &euro;${(item.price * item.qty).toFixed(2)}
      </td>
    </tr>`).join('');
}

function totalsBlock(
  productItems: MerchOrderItem[],
  shippingCost: number,
  total: number,
  t: (typeof COPY)[EmailLocale],
) {
  const shippingRow = shippingCost > 0 ? `
    <tr>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#7a4a4a;">${t.spedizione}</td>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#7a4a4a;text-align:right;">&euro;${shippingCost.toFixed(2)}</td>
    </tr>` : '';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemRows(productItems)}
      ${shippingRow}
      <tr>
        <td style="padding:14px 0 0;font-family:sans-serif;font-size:15px;font-weight:700;color:#1a0505;letter-spacing:0.03em;">${t.totale}</td>
        <td style="padding:14px 0 0;font-family:sans-serif;font-size:15px;font-weight:700;color:#731515;text-align:right;">&euro;${total.toFixed(2)}</td>
      </tr>
    </table>`;
}

/* La riga della spedizione arriva da Stripe col nome italiano, perche'
   e' cosi' che la scriviamo nel carrello: si riconosce da quello, non
   dalla lingua di chi legge. */
function dividi(items: MerchOrderItem[]) {
  const productItems = items.filter(i => i.name !== 'Spedizione');
  const shippingCost = items.find(i => i.name === 'Spedizione')?.price ?? 0;
  return { productItems, shippingCost };
}

function piedeDomande(t: (typeof COPY)[EmailLocale]) {
  return `
    <p style="margin:0;font-family:sans-serif;font-size:12px;color:#7a4a4a;line-height:1.6;">
      ${t.domande}
      <a href="mailto:info@vivowineclub.com" style="color:#731515;text-decoration:none;">info@vivowineclub.com</a>.
    </p>`;
}

// ── Conferma dell'ordine ─────────────────────────────────────────────────────

export async function sendMerchOrderConfirmation({
  to, name, items, total, locale,
}: {
  to:    string;
  name:  string | null;
  items: MerchOrderItem[];
  total: number;
  /** La lingua del sito al momento dell'acquisto. */
  locale?: string | null;
}) {
  const t = COPY[emailLocale(locale)];
  const { productItems, shippingCost } = dividi(items);
  const firstName = name?.split(' ')[0] ?? null;

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:400;color:#1a0505;letter-spacing:-0.5px;">
      ${t.confermaTitolo(firstName)}
    </h1>
    <p style="margin:0 0 28px;font-family:sans-serif;font-size:14px;color:#7a4a4a;line-height:1.7;">
      ${t.confermaCorpo}
    </p>
    ${totalsBlock(productItems, shippingCost, total, t)}
    ${piedeDomande(t)}`;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: t.confermaOggetto,
    html:    emailShell(body),
  });
}

// ── Avviso a noi: c'e' un ordine da preparare ────────────────────────────────

function rigaInterna(label: string, valore: string | null | undefined) {
  if (!valore) return '';
  return `
<tr>
  <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a4a4a;width:140px;white-space:nowrap;vertical-align:top;" class="em-label">${label}</td>
  <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;white-space:pre-wrap;">${valore}</td>
</tr>`;
}

export async function sendMerchOrderNotification({
  name, email, items, total, phone, indirizzo, note,
}: {
  name:  string | null;
  email: string | null;
  items: MerchOrderItem[];
  total: number;
  phone?: string | null;
  indirizzo?: string | null;
  note?: string | null;
}) {
  const { productItems } = dividi(items);
  const roba = productItems.map((i) => `${i.qty}× ${i.name}`).join('\n');

  const body = `
<h2 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#1a0505;" class="em-h1">Nuovo ordine dallo shop</h2>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7a4a4a;">
  ${name || email || 'Senza nome'} ha ordinato per <strong style="color:#731515;">&euro;${total.toFixed(2)}</strong>.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #eddada;border-radius:4px;overflow:hidden;">
  ${rigaInterna('Cosa', roba)}
  ${rigaInterna('Totale', `&euro;${total.toFixed(2)}`)}
  ${rigaInterna('Nome', name)}
  ${rigaInterna('Email', email)}
  ${rigaInterna('Telefono', phone)}
  ${rigaInterna('Spedire a', indirizzo)}
  ${rigaInterna('Note di consegna', note)}
</table>
<p style="margin:20px 0 0;font-family:sans-serif;font-size:12px;color:#7a4a4a;">
  È in area riservata, sotto Shop, fra gli ordini da evadere.
</p>`;

  await resend.emails.send({
    from:    FROM,
    to:      A_NOI,
    subject: `Nuovo ordine shop: ${name || email || 'senza nome'} (€${total.toFixed(2)})`,
    html:    emailShell(body),
  });
}

// ── Avviso di spedizione ─────────────────────────────────────────────────────

export async function sendMerchShippingNotification({
  to, name, items, total, carrier, trackingCode, trackingUrl, shippingNotes, shippingAddress, locale,
}: {
  to:              string;
  name:            string | null;
  items:           MerchOrderItem[];
  total:           number;
  carrier?:        string | null;
  trackingCode?:   string | null;
  trackingUrl?:    string | null;
  shippingNotes?:  string | null;
  shippingAddress?: string | null;
  /** Se non si sa, si ricava dal paese di consegna. */
  locale?: string | null;
}) {
  const t = COPY[emailLocale(locale)];
  const { productItems, shippingCost } = dividi(items);
  const firstName = name?.split(' ')[0] ?? null;

  const trackingBlock = (carrier || trackingCode) ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fdf6f6;border:1px solid #eddada;border-radius:6px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#731515;">${t.datiSpedizione}</p>
        ${carrier ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>${t.corriere}:</strong> ${carrier}</p>` : ''}
        ${trackingCode ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>${t.codice}:</strong> ${trackingCode}</p>` : ''}
        ${trackingUrl ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>${t.traccia}:</strong> <a href="${trackingUrl}" target="_blank" style="color:#731515;text-decoration:underline;">${trackingUrl}</a></p>` : ''}
        ${shippingAddress ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>${t.destinazione}:</strong> ${shippingAddress}</p>` : ''}
        ${shippingNotes ? `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7a4a4a;font-style:italic;">${shippingNotes}</p>` : ''}
      </td></tr>
    </table>` : '';

  const trackingCta = trackingUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td align="center" style="background-color:#731515;border-radius:6px;">
          <a href="${trackingUrl}" target="_blank"
             style="display:inline-block;padding:12px 28px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;text-decoration:none;letter-spacing:0.1em;border-radius:6px;">
            ${t.bottoneTraccia}
          </a>
        </td>
      </tr>
    </table>` : '';

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:400;color:#1a0505;letter-spacing:-0.5px;">
      ${t.spedizioneTitolo(firstName)}
    </h1>
    <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#7a4a4a;line-height:1.7;">
      ${t.spedizioneCorpo}
    </p>
    ${trackingBlock}
    ${trackingCta}
    ${totalsBlock(productItems, shippingCost, total, t)}
    ${piedeDomande(t)}`;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: t.spedizioneOggetto,
    html:    emailShell(body),
  });
}
