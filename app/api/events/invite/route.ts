import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAdminEmail } from '@/lib/admins';
import { emailShell, ctaButton, divider } from '@/lib/email-shell';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildInviteHtml(bodyText: string, eventSlug: string): string {
  const escaped = bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const paragraphs = escaped
    .split(/\n\n+/)
    .map(block => block.replace(/\n/g, '<br/>'))
    .map(p => `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3a1a1a;line-height:1.75;" class="em-p">${p}</p>`)
    .join('');

  const body = `
${paragraphs}
${divider('24px 0')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td align="center">
    ${ctaButton('BOOK YOUR SPOT →', `https://vivowineclub.com/checkout/${eventSlug}`)}
  </td></tr>
</table>`;

  return emailShell(body);
}

/**
 * POST /api/events/invite
 * Body: { eventSlug, subject, body }
 * Fetches all CRM customers and sends a personalised invitation to each.
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

  const reqBody = await request.json();
  const { eventSlug, subject, body: bodyText } = reqBody as {
    eventSlug: string;
    subject:   string;
    body:      string;
  };

  if (!eventSlug || !subject || !bodyText) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Fetch all customers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customers, error: dbErr } = await (getSupabaseAdmin() as any)
    .from('customers')
    .select('email, name');

  if (dbErr) {
    console.error('[events/invite] DB error:', dbErr);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!customers?.length) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0 });
  }

  const results = await Promise.allSettled(
    (customers as Array<{ email: string; name: string }>).map(({ email, name }) => {
      const firstName = name.split(' ')[0] || name;
      const personalised = bodyText
        .replace(/\[Nome\]/g, firstName)
        .replace(/\[Name\]/g, firstName)
        .replace(/\[Prénom\]/g, firstName);
      return resend.emails.send({
        from:     'Vivo Wine Club <noreply@vivowineclub.com>',
        replyTo: 'info@vivowineclub.com',
        to:       `${name} <${email}>`,
        subject,
        html:     buildInviteHtml(personalised, eventSlug),
        headers: {
          'List-Unsubscribe': '<mailto:info@vivowineclub.com?subject=Unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
    }),
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ ok: true, sent, failed, total: customers.length });
}
