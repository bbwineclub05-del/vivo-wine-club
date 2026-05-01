import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

const CONFIRMATION_HTML = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" />
  </div>
  <h2 style="text-align:center;">We received your application.</h2>
  <p>Thank you for applying to Vivo Wine Club. We will review your application and get back to you within a few days.</p>
  <p style="text-align:center;">
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

function notificationHtml(data: Record<string, string>) {
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <h2>New membership application</h2>
  <table style="width:100%;border-collapse:collapse;">
    ${Object.entries(data)
      .map(
        ([k, v]) => `
    <tr>
      <td style="padding:8px 12px;background:#f5f0f0;font-weight:600;width:140px;text-transform:uppercase;font-size:12px;">${k}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8d5d5;">${v || '—'}</td>
    </tr>`
      )
      .join('')}
  </table>
</div>
`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, city, age, source, experience, motivation } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Save to Supabase
  const { error: dbError } = await supabase.from('applications').insert({
    name,
    email,
    phone:      phone      || null,
    city:       city       || null,
    age:        age        ? parseInt(age) : null,
    source:     source     || null,
    experience: experience || null,
    motivation: motivation || null,
  });

  if (dbError) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Send confirmation to applicant and notification to team (in parallel)
  await Promise.allSettled([
    resend.emails.send({
      from: 'noreply@vivowineclub.com',
      to: email,
      subject: 'We received your application — Vivo Wine Club',
      html: CONFIRMATION_HTML,
    }),
    resend.emails.send({
      from: 'noreply@vivowineclub.com',
      to: 'info@vivowineclub.com',
      subject: 'New membership application',
      html: notificationHtml({ name, email, phone, city, age, source, experience, motivation }),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
