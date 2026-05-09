import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildContactHtml(subject: string, body: string): string {
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;color:#3a1a1a;line-height:1.7;">')
    .replace(/\n/g, '<br/>');

  return `
<div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:52px;" alt="Vivo Wine Club" />
  </div>
  <div style="padding:0 8px;">
    <p style="margin:0 0 16px;color:#3a1a1a;line-height:1.7;">${htmlBody}</p>
  </div>
  <p style="margin-top:40px;color:#bbb;font-size:11px;text-align:center;border-top:1px solid #e8d5d5;padding-top:20px;">
    Vivo Wine Club &middot;
    <a href="https://vivowineclub.com" style="color:#6b1a1a;">vivowineclub.com</a> &middot;
    <a href="mailto:info@vivowineclub.com" style="color:#6b1a1a;">info@vivowineclub.com</a>
  </p>
</div>`;
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      to,           // string — recipient email
      toName,       // string — recipient name
      subject,      // string
      text,         // string — plain-text body (newlines allowed)
      attachPitch,  // boolean — whether to attach the pitch PDF
    } = body as {
      to: string;
      toName: string;
      subject: string;
      text: string;
      attachPitch?: boolean;
    };

    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'to, subject and text are required' }, { status: 400 });
    }

    const html = buildContactHtml(subject, text);

    // Build attachments if requested and PDF exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attachments: any[] = [];
    if (attachPitch) {
      const pdfPath = path.join(process.cwd(), 'public', 'vivo-pitch.pdf');
      if (fs.existsSync(pdfPath)) {
        const content = fs.readFileSync(pdfPath).toString('base64');
        attachments.push({
          filename: 'Vivo Wine Club - Presentation.pdf',
          content,
        });
      }
    }

    const payload = {
      from:    'Vivo Wine Club <info@vivowineclub.com>',
      to:      `${toName} <${to}>`,
      subject,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    };

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error('[crm/contact-email]', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error('[crm/contact-email]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
