import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { emailShell, heading, para, ctaButton, divider } from '@/lib/email-shell';

const resend = new Resend(process.env.RESEND_API_KEY);

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

function welcomeHtml(name: string, inviteLink?: string): string {
  const firstName = name.split(' ')[0];
  const ctaBlock = inviteLink
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;">
  <tr><td align="center">${ctaButton('SET YOUR PASSWORD →', inviteLink)}</td></tr>
</table>`
    : `${para('<a href="https://vivowineclub.com/login" style="color:#731515;">Log in to your account →</a>', 'text-align:center;')}`;

  const body = `
${heading(`Welcome to the club, ${firstName}.`, 'Your application has been approved.')}
${divider()}
${para(`We're excited to have you as part of Vivo Wine Club. You now have access to our exclusive events, private winery visits, and a community of people who love wine as much as we do.`)}
${para('Set your password to access your members area, explore upcoming events, and stay up to date with everything happening at Vivo.')}
${ctaBlock}
${divider('28px 0 0')}
${para('Have questions? Reach us at <a href="mailto:info@vivowineclub.com" style="color:#731515;">info@vivowineclub.com</a> — we\'re always happy to help.', 'font-size:13px;')}`;
  return emailShell(body);
}

function rejectionHtml(name: string): string {
  const firstName = name.split(' ')[0];
  const body = `
${heading(`Thank you for applying, ${firstName}.`)}
${divider()}
${para(`We truly appreciate your interest in Vivo Wine Club. After careful review, we're unable to offer you a membership at this time — our current intake is limited and we receive many applications.`)}
${para('We hope to welcome you in a future round. In the meantime, you can still attend our open events and follow us on LinkedIn for updates.')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;">
  <tr><td align="center">${ctaButton('VIEW UPCOMING EVENTS →', 'https://vivowineclub.com/events')}</td></tr>
</table>`;
  return emailShell(body);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    let body: Record<string, string>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status } = body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Fetch the application to get name/email
    const { data: app, error: fetchErr } = await db
      .from('applications')
      .select('id, name, email, status')
      .eq('id', id)
      .single();

    if (fetchErr || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Update status
    const { data: updated, error: updateErr } = await db
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // On approval: create auth user, set role, send welcome email with invite link
    if (status === 'approved') {
      const supabase = getSupabaseAdmin();
      let inviteLink: string | undefined;

      // Try to generate an invite link (new user)
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type:  'invite',
        email: app.email,
        options: {
          data:       { name: app.name },
          redirectTo: 'https://vivowineclub.com/members/impostazioni',
        },
      });

      if (!linkErr && linkData?.properties?.action_link) {
        inviteLink = linkData.properties.action_link;
        // Set member role on the newly created user
        const newUserId = linkData.user?.id;
        if (newUserId) {
          await supabase.auth.admin.updateUserById(newUserId, {
            app_metadata: { role: 'member' },
          });
        }
      } else {
        // User already exists — find and update their role
        console.log('[applications] generateLink error (user may exist):', linkErr?.message);
        const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });
        const existingUser = usersData?.users?.find(u => u.email === app.email);
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            app_metadata: { role: 'member' },
          });
        }
      }

      try {
        const emailResult = await resend.emails.send({
          from:     'Vivo Wine Club <noreply@vivowineclub.com>',
          replyTo: 'info@vivowineclub.com',
          to:       app.email,
          subject:  `Welcome to Vivo Wine Club, ${app.name.split(' ')[0]}!`,
          html:    welcomeHtml(app.name, inviteLink),
        });

        if (emailResult.error) {
          console.error('[applications] Resend error:', JSON.stringify(emailResult.error));
        } else {
          console.log('[applications] Welcome email sent, id:', emailResult.data?.id);
        }
      } catch (emailErr) {
        console.error('[applications] Resend exception:', emailErr);
      }
    } else if (status === 'rejected') {
      try {
        const emailResult = await resend.emails.send({
          from:     'Vivo Wine Club <noreply@vivowineclub.com>',
          replyTo: 'info@vivowineclub.com',
          to:       app.email,
          subject:  'Your Vivo Wine Club application',
          html:    rejectionHtml(app.name),
        });

        if (emailResult.error) {
          console.error('[applications] Resend error:', JSON.stringify(emailResult.error));
        } else {
          console.log('[applications] Rejection email sent, id:', emailResult.data?.id);
        }
      } catch (emailErr) {
        console.error('[applications] Resend exception:', emailErr);
      }
    }

    return NextResponse.json({ application: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
