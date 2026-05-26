/**
 * Shared email rendering utilities.
 *
 * All templates are built with HTML tables (not flexbox/grid) so they render
 * correctly in Gmail, Outlook 2007-2021, Apple Mail, and all mobile clients.
 *
 * Dark-mode overrides are applied via a <style> block in <head> — supported by
 * Apple Mail, Gmail iOS/Android, and Samsung Mail. Other clients fall back to
 * the light-mode colours silently.
 */

export const LOGO_URL = 'https://vivowineclub.com/logobianco.png';

// ── Full HTML document shell ─────────────────────────────────────────────────

export function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Vivo Wine Club</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      body,  .em-bg      { background-color: #180303 !important; }
      .em-card           { background-color: #250606 !important; border-color: #3d1010 !important; }
      .em-body           { background-color: #250606 !important; }
      .em-footer         { background-color: #1c0404 !important; border-top-color: #3d1010 !important; }
      .em-h1             { color: #f5e8e8 !important; }
      .em-p              { color: #c8a0a0 !important; }
      .em-muted          { color: #906060 !important; }
      .em-link           { color: #e88a8a !important; }
      .em-divider td     { border-top-color: #3d1010 !important; }
      .em-row-even       { background-color: #300a0a !important; }
      .em-label          { color: #c07070 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f9f3f3;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;" class="em-bg">

  <!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="min-width:100%;background-color:#f9f3f3;" class="em-bg">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
               style="max-width:560px;background-color:#ffffff;border:1px solid #eddada;border-radius:8px;" class="em-card">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#1a0505;padding:26px 32px;border-radius:8px 8px 0 0;">
              <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center"><![endif]-->
              <img
                src="${LOGO_URL}"
                alt="Vivo Wine Club"
                width="140"
                height="40"
                style="display:block;border:0;-ms-interpolation-mode:bicubic;max-width:140px;height:auto;"
              />
              <!--[if mso]></td></tr></table><![endif]-->
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;background-color:#ffffff;" class="em-body">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                style="background-color:#fdf6f6;border-top:1px solid #eddada;padding:18px 32px;border-radius:0 0 8px 8px;"
                class="em-footer">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7a4a4a;line-height:1.8;" class="em-muted">
                Vivo Wine Club &nbsp;&middot;&nbsp;
                <a href="https://vivowineclub.com" style="color:#731515;text-decoration:none;" class="em-link">vivowineclub.com</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:info@vivowineclub.com" style="color:#731515;text-decoration:none;" class="em-link">info@vivowineclub.com</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</body>
</html>`;
}

// ── CTA button (table-based, Outlook-safe) ───────────────────────────────────

export function ctaButton(label: string, url: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'secondary' ? '#3d0808' : '#6b1a1a';
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td align="center" style="background-color:${bg};border-radius:4px;" bgcolor="${bg}">
      <a href="${url}"
         target="_blank"
         style="display:inline-block;padding:13px 30px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.12em;border-radius:4px;-webkit-text-size-adjust:none;mso-padding-alt:13px 30px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

// ── Divider ──────────────────────────────────────────────────────────────────

export function divider(margin = '24px 0'): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="margin:${margin};" class="em-divider">
  <tr><td style="border-top:1px solid #eddada;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;
}

// ── Heading block ────────────────────────────────────────────────────────────

export function heading(title: string, subtitle?: string): string {
  const sub = subtitle
    ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7a4a4a;text-align:center;font-style:italic;line-height:1.6;" class="em-p">${subtitle}</p>`
    : '';
  return `
<h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#1a0505;text-align:center;letter-spacing:-0.2px;line-height:1.3;" class="em-h1">${title}</h1>
${sub}`;
}

// ── Body paragraph ───────────────────────────────────────────────────────────

export function para(text: string, style = ''): string {
  return `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3a1a1a;line-height:1.75;${style}" class="em-p">${text}</p>`;
}
