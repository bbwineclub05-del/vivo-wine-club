import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAdminEmail } from '@/lib/admins';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildInviteHtml(bodyText: string, eventSlug: string): string {
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
  <div style="text-align:center;margin:36px 0;">
    <a href="https://vivowineclub.com/checkout/${eventSlug}"
       style="display:inline-block;background-color:#6b1a1a;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:13px;letter-spacing:0.08em;font-weight:600;">
      PRENOTA IL TUO POSTO →
    </a>
  </div>
  <p style="margin-top:40px;color:#bbb;font-size:11px;text-align:center;border-top:1px solid #e8d5d5;padding-top:20px;">
    Vivo Wine Club &middot;
    <a href="https://vivowineclub.com" style="color:#6b1a1a;">vivowineclub.com</a> &middot;
    <a href="mailto:info@vivowineclub.com" style="color:#6b1a1a;">info@vivowineclub.com</a>
  </p>
</div>`;
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
        from: 'Vivo Wine Club <info@vivowineclub.com>',
        to:   `${name} <${email}>`,
        subject,
        html: buildInviteHtml(personalised, eventSlug),
      });
    }),
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ ok: true, sent, failed, total: customers.length });
}
