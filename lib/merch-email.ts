import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = 'Vivo Wine Club <info@vivowineclub.com>';
const LOGO = 'https://vivowineclub.com/logobianco.png';

export interface MerchOrderItem { name: string; qty: number; price: number }

// ── HTML shell ────────────────────────────────────────────────────────────────

function emailShell(body: string) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Vivo Wine Club</title>
</head>
<body style="margin:0;padding:0;background:#f9f3f3;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f3f3;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eddada;">
        <tr>
          <td style="background:#1a0505;padding:28px 32px;text-align:center;">
            <img src="${LOGO}" alt="Vivo Wine Club" height="44" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:#fdf6f6;border-top:1px solid #eddada;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-family:sans-serif;font-size:12px;color:#7a4a4a;line-height:1.8;">
              Vivo Wine Club &nbsp;&middot;&nbsp;
              <a href="https://vivowineclub.com" style="color:#731515;text-decoration:none;">vivowineclub.com</a>
              &nbsp;&middot;&nbsp;
              <a href="mailto:info@vivowineclub.com" style="color:#731515;text-decoration:none;">info@vivowineclub.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
      Il tuo ordine è in arrivo${firstName ? `, ${firstName}` : ''}! 🚚
    </h1>
    <p style="margin:0 0 28px;font-family:sans-serif;font-size:14px;color:#7a4a4a;line-height:1.7;">
      Abbiamo spedito il tuo ordine. Il pacco sarà da te presto!
    </p>
    ${totalsBlock(productItems, shippingCost, total)}
    <p style="margin:0;font-family:sans-serif;font-size:12px;color:#7a4a4a;line-height:1.6;">
      Per qualsiasi domanda scrivici a
      <a href="mailto:info@vivowineclub.com" style="color:#731515;text-decoration:none;">info@vivowineclub.com</a>.
    </p>`;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: 'Il tuo ordine Vivo Wine Club è stato spedito! 🚚',
    html:    emailShell(body),
  });
}
