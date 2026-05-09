import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAdminEmail } from '@/lib/admins';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildHtml(bodyText: string): string {
  const escaped = bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const htmlBody = escaped
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

/**
 * POST /api/crm/customers/bulk-email
 * Body: { recipients: Array<{email, name}>, subject, text }
 * Sends a personalised email to each recipient (replaces [Nome]/[Name]/[Prénom]).
 */
export async function POST(request: Request) {
  const authHeader  = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } =
    await getSupabaseAdmin().auth.getUser(accessToken);

  if (authError || !user || !isAdminEmail(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { recipients, subject, text } = body as {
    recipients: Array<{ email: string; name: string }>;
    subject: string;
    text: string;
  };

  if (!recipients?.length || !subject || !text) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const results = await Promise.allSettled(
    recipients.map(({ email, name }) => {
      const firstName = name.split(' ')[0] || name;
      const personalised = text
        .replace(/\[Nome\]/g, firstName)
        .replace(/\[Name\]/g, firstName)
        .replace(/\[Prénom\]/g, firstName);
      return resend.emails.send({
        from: 'Vivo Wine Club <info@vivowineclub.com>',
        to:   `${name} <${email}>`,
        subject,
        html: buildHtml(personalised),
      });
    }),
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ ok: true, sent, failed });
}
