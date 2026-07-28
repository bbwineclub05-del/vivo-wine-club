import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';
import { emailShell, heading, para, ctaButton, divider } from '@/lib/email-shell';
import { getClientIp, PRIVACY_POLICY_VERSION } from '@/lib/consent';

const resend = new Resend(process.env.RESEND_API_KEY);

function confirmationHtml(): string {
  const body = `
${heading('We received your application.')}
${para('Thank you for applying to Vivo Wine Club. We will review your application and get back to you within a few days.')}
${divider()}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
  <tr><td align="center">
    ${ctaButton('VISIT OUR WEBSITE →', 'https://vivowineclub.com')}
  </td></tr>
</table>`;
  return emailShell(body);
}

function notificationHtml(data: Record<string, string>): string {
  const rows = Object.entries(data).map(([k, v], i) => `
    <tr class="${i % 2 === 0 ? 'em-row-even' : ''}">
      <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a4a4a;width:130px;white-space:nowrap;" class="em-label">${k}</td>
      <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;">${v || '—'}</td>
    </tr>`).join('');

  const body = `
<h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#1a0505;" class="em-h1">New membership application</h2>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #eddada;border-radius:4px;overflow:hidden;">
  ${rows}
</table>`;
  return emailShell(body);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, city, date_of_birth, source, experience, motivation } = body;
  const consentPrivacy   = body.consent_privacy === true;
  const consentAge       = body.consent_age === true;
  const consentMarketing = body.consent_marketing === true;

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // Privacy Policy consent and 18+ declaration are REQUIRED — reject if not explicitly true
  if (!consentPrivacy || !consentAge) {
    return NextResponse.json({ error: 'Consent to the Privacy Policy and age confirmation are required.' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Save to Supabase
  const { error: dbError } = await supabase.from('applications').insert({
    name,
    email,
    phone:         phone         || null,
    city:          city          || null,
    date_of_birth: date_of_birth || null,
    source:        source        || null,
    experience:    experience    || null,
    motivation:    motivation    || null,
    consent_privacy_accepted_at:   now,
    consent_privacy_version:       PRIVACY_POLICY_VERSION,
    consent_age_confirmed:         consentAge,
    consent_marketing:             consentMarketing,
    consent_marketing_accepted_at: consentMarketing ? now : null,
    consent_ip:                    getClientIp(request),
  });

  if (dbError) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Send confirmation to applicant and notification to team (in parallel)
  await Promise.allSettled([
    resend.emails.send({
      from:     'Vivo Wine Club <noreply@vivowineclub.com>',
      replyTo: 'info@vivowineclub.com',
      to:       email,
      subject:  'We received your application — Vivo Wine Club',
      html:     confirmationHtml(),
    }),
    resend.emails.send({
      from:    'Vivo Wine Club <noreply@vivowineclub.com>',
      to:      'info@vivowineclub.com',
      subject: 'New membership application',
      html: notificationHtml({ name, email, phone, city, date_of_birth, source, experience, motivation }),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
