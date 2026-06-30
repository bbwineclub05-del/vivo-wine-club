import { Resend } from 'resend';
import { emailShell } from '@/lib/email-shell';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = 'Vivo Wine Club <info@vivowineclub.com>';

export interface MerchOrderItem { name: string; qty: number; price: number }

// ── Shared item rows ──────────────────────────────────────────────────────────

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

function totalsBlock(productItems: MerchOrderItem[], shippingCost: number, total: number) {
  const shippingRow = shippingCost > 0 ? `
    <tr>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#7a4a4a;">Spedizione</td>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#7a4a4a;text-align:right;">&euro;${shippingCost.toFixed(2)}</td>
    </tr>` : '';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemRows(productItems)}
      ${shippingRow}
      <tr>
        <td style="padding:14px 0 0;font-family:sans-serif;font-size:15px;font-weight:700;color:#1a0505;letter-spacing:0.03em;">TOTALE</td>
        <td style="padding:14px 0 0;font-family:sans-serif;font-size:15px;font-weight:700;color:#731515;text-align:right;">&euro;${total.toFixed(2)}</td>
      </tr>
    </table>`;
}

// ── Order confirmation ────────────────────────────────────────────────────────

export async function sendMerchOrderConfirmation({
  to, name, items, total,
}: {
  to:    string;
  name:  string | null;
  items: MerchOrderItem[];
  total: number;
}) {
  const productItems = items.filter(i => i.name !== 'Spedizione');
  const shippingItem = items.find(i => i.name === 'Spedizione');
  const shippingCost = shippingItem?.price ?? 0;
  const firstName    = name?.split(' ')[0] ?? null;

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:400;color:#1a0505;letter-spacing:-0.5px;">
      Grazie per il tuo ordine${firstName ? `, ${firstName}` : ''}!
    </h1>
    <p style="margin:0 0 28px;font-family:sans-serif;font-size:14px;color:#7a4a4a;line-height:1.7;">
      Abbiamo ricevuto il tuo ordine e lo stiamo preparando.
      Riceverai un&rsquo;altra email non appena verrà spedito.
    </p>
    ${totalsBlock(productItems, shippingCost, total)}
    <p style="margin:0;font-family:sans-serif;font-size:12px;color:#7a4a4a;line-height:1.6;">
      Per qualsiasi domanda scrivici a
      <a href="mailto:info@vivowineclub.com" style="color:#731515;text-decoration:none;">info@vivowineclub.com</a>.
    </p>`;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: 'Il tuo ordine Vivo Wine Club — conferma ricevuta ✓',
    html:    emailShell(body),
  });
}

// ── Shipping notification ─────────────────────────────────────────────────────

export async function sendMerchShippingNotification({
  to, name, items, total, carrier, trackingCode, trackingUrl, shippingNotes, shippingAddress,
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
}) {
  const productItems = items.filter(i => i.name !== 'Spedizione');
  const shippingItem = items.find(i => i.name === 'Spedizione');
  const shippingCost = shippingItem?.price ?? 0;
  const firstName    = name?.split(' ')[0] ?? null;

  // Build tracking block
  const trackingBlock = (carrier || trackingCode) ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fdf6f6;border:1px solid #eddada;border-radius:6px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#731515;">DATI SPEDIZIONE</p>
        ${carrier ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>Corriere:</strong> ${carrier}</p>` : ''}
        ${trackingCode ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>Codice tracciamento:</strong> ${trackingCode}</p>` : ''}
        ${trackingUrl ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>Traccia il pacco:</strong> <a href="${trackingUrl}" target="_blank" style="color:#731515;text-decoration:underline;">${trackingUrl}</a></p>` : ''}
        ${shippingAddress ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;"><strong>Destinazione:</strong> ${shippingAddress}</p>` : ''}
        ${shippingNotes ? `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7a4a4a;font-style:italic;">${shippingNotes}</p>` : ''}
      </td></tr>
    </table>` : '';

  const trackingCta = trackingUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td align="center" style="background-color:#731515;border-radius:6px;">
          <a href="${trackingUrl}" target="_blank"
             style="display:inline-block;padding:12px 28px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;text-decoration:none;letter-spacing:0.1em;border-radius:6px;">
            TRACCIA IL TUO PACCO
          </a>
        </td>
      </tr>
    </table>` : '';

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:400;color:#1a0505;letter-spacing:-0.5px;">
      Il tuo ordine è in arrivo${firstName ? `, ${firstName}` : ''}! 🚚
    </h1>
    <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#7a4a4a;line-height:1.7;">
      Abbiamo spedito il tuo ordine. Il pacco sarà da te presto!
    </p>
    ${trackingBlock}
    ${trackingCta}
    ${totalsBlock(productItems, shippingCost, total)}
    <p style="margin:0;font-family:sans-serif;font-size:12px;color:#7a4a4a;line-height:1.6;">
      Per qualsiasi domanda scrivici a
      <a href="mailto:info@vivowineclub.com" style="color:#731515;text-decoration:none;">info@vivowineclub.com</a>.
    </p>`;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: 'Vivo Wine Club — Il tuo ordine è stato spedito! 🚚',
    html:    emailShell(body),
  });
}
