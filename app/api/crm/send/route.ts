import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  console.error('[crm/send] RESEND_API_KEY missing');
}

function buildHtml(subject: string, body: string): string {
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;">')
    .replace(/\n/g, '<br/>');

  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:56px;" alt="Vivo Wine Club" />
  </div>
  <p style="margin:0 0 16px;">${htmlBody}</p>
  <p style="margin-top:40px;color:#bbb;font-size:11px;text-align:center;border-top:1px solid #e8d5d5;padding-top:20px;">
    Vivo Wine Club · <a href="https://vivowineclub.com" style="color:#6b1a1a;">vivowineclub.com</a>
    · <a href="mailto:info@vivowineclub.com" style="color:#6b1a1a;">info@vivowineclub.com</a>
  </p>
</div>`;
}

function buildEventHtml(params: {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventDescription: string;
  ctaText: string;
  ctaLink: string;
}): string {
  const { eventTitle, eventDate, eventLocation, eventDescription, ctaText, ctaLink } = params;
  const htmlDescription = eventDescription
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;color:#3a1a1a;">').replace(/\n/g, '<br/>');

  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:56px;" alt="Vivo Wine Club" />
  </div>

  <p style="font-size:11px;letter-spacing:0.3em;color:#731515;margin:0 0 12px;text-transform:uppercase;">NEW EVENT</p>
  <h2 style="font-weight:300;font-size:28px;margin:0 0 24px;line-height:1.2;">${eventTitle}</h2>

  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;color:#7a4a4a;width:120px;">Date</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;font-weight:600;">${eventDate}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#7a4a4a;">Location</td>
      <td style="padding:10px 0;">${eventLocation}</td>
    </tr>
  </table>

  <p style="margin:0 0 16px;color:#3a1a1a;line-height:1.7;">${htmlDescription}</p>

  <p style="text-align:center;margin:40px 0;">
    <a href="${ctaLink}"
       style="background-color:#6b1a1a;color:white;padding:14px 32px;text-decoration:none;
              border-radius:4px;font-size:14px;letter-spacing:0.08em;">
      ${ctaText} →
    </a>
  </p>

  <p style="margin-top:40px;color:#bbb;font-size:11px;text-align:center;border-top:1px solid #e8d5d5;padding-top:20px;">
    Vivo Wine Club · <a href="https://vivowineclub.com" style="color:#6b1a1a;">vivowineclub.com</a>
    · <a href="mailto:info@vivowineclub.com" style="color:#6b1a1a;">info@vivowineclub.com</a>
  </p>
</div>`;
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { type, recipients, subject, text, eventParams } = body as {
      type: 'custom' | 'event';
      recipients: { email: string; name: string }[];
      subject: string;
      text?: string;
      eventParams?: {
        eventTitle: string;
        eventDate: string;
        eventLocation: string;
        eventDescription: string;
        ctaText: string;
        ctaLink: string;
      };
    };

    if (!recipients?.length || !subject) {
      return NextResponse.json({ error: 'Missing recipients or subject' }, { status: 400 });
    }

    const html = type === 'event' && eventParams
      ? buildEventHtml(eventParams)
      : buildHtml(subject, text ?? '');

    // Send individually (privacy: each recipient doesn't see others)
    const results = await Promise.allSettled(
      recipients.map(({ email, name }) =>
        resend.emails.send({
          from:    'noreply@vivowineclub.com',
          to:      email,
          subject,
          html:    html.replace('{{name}}', name.split(' ')[0]),
        }),
      ),
    );

    const sent   = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log failures
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[crm/send] Failed for ${recipients[i]?.email}:`, r.reason);
      }
    });

    return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
  } catch (err) {
    console.error('[crm/send]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
