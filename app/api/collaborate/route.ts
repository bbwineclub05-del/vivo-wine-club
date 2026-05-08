import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function confirmationHtml(name: string) {
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" />
  </div>
  <h2 style="text-align:center;">We received your proposal.</h2>
  <p>Hi ${name},</p>
  <p>Thank you for reaching out to Vivo Wine Club. We have received your collaboration proposal and will get back to you as soon as possible.</p>
  <p style="text-align:center;margin-top:32px;">
    <a href="https://vivowineclub.com" style="background-color:#6b1a1a;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-size:14px;">
      VISIT OUR WEBSITE →
    </a>
  </p>
  <p style="margin-top:32px;color:#999;font-size:12px;text-align:center;">
    The Vivo Wine Club Team<br>
    info@vivowineclub.com<br>
    vivowineclub.com
  </p>
</div>
`;
}

function notificationHtml(data: { name: string; email: string; type: string; proposal: string }) {
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <h2>New collaboration request</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:8px 12px;background:#f5f0f0;font-weight:600;width:140px;text-transform:uppercase;font-size:12px;">Name</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8d5d5;">${data.name}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;background:#f5f0f0;font-weight:600;text-transform:uppercase;font-size:12px;">Email</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8d5d5;">${data.email}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;background:#f5f0f0;font-weight:600;text-transform:uppercase;font-size:12px;">Type</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8d5d5;">${data.type || '—'}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;background:#f5f0f0;font-weight:600;text-transform:uppercase;font-size:12px;">Proposal</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8d5d5;white-space:pre-wrap;">${data.proposal}</td>
    </tr>
  </table>
</div>
`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, type, proposal } = body;

  if (!name || !email || !proposal) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await Promise.allSettled([
    resend.emails.send({
      from: 'noreply@vivowineclub.com',
      to: email,
      subject: 'We received your proposal — Vivo Wine Club',
      html: confirmationHtml(name),
    }),
    resend.emails.send({
      from: 'noreply@vivowineclub.com',
      to: 'info@vivowineclub.com',
      subject: `New collaboration request — ${type || 'General'}`,
      html: notificationHtml({ name, email, type, proposal }),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
