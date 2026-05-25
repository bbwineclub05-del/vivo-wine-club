import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

const resend = new Resend(process.env.RESEND_API_KEY);

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

function welcomeHtml(name: string, inviteLink?: string) {
  const firstName = name.split(' ')[0];
  const setPasswordButton = inviteLink ? `
  <p style="text-align:center;margin:16px 0 0;">
    <a href="${inviteLink}"
       style="background-color:#3d0808;color:white;padding:14px 32px;text-decoration:none;
              border-radius:4px;font-size:14px;letter-spacing:0.08em;">
      SET YOUR PASSWORD →
    </a>
  </p>` : '';
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:28px;margin-bottom:36px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" alt="Vivo Wine Club" />
  </div>

  <h2 style="text-align:center;font-weight:300;font-size:26px;margin-bottom:8px;">
    Welcome to the club, ${firstName}.
  </h2>
  <p style="text-align:center;color:#7a4a4a;font-style:italic;margin-bottom:32px;font-size:15px;">
    Your application has been approved.
  </p>

  <p style="line-height:1.7;color:#3a1a1a;">
    We're excited to have you as part of Vivo Wine Club. You now have access to our exclusive
    events, private winery visits, and a community of people who love wine as much as we do.
  </p>

  <p style="line-height:1.7;color:#3a1a1a;">
    Log in to your members area to explore what's coming up, manage your profile, and stay
    up to date with everything happening at Vivo.
  </p>

  <p style="text-align:center;margin:40px 0 0;">
    <a href="https://vivowineclub.com/members"
       style="background-color:#6b1a1a;color:white;padding:14px 32px;text-decoration:none;
              border-radius:4px;font-size:14px;letter-spacing:0.08em;">
      ACCESS MEMBERS AREA →
    </a>
  </p>
  ${setPasswordButton}

  <div style="border-top:1px solid #e8d5d5;margin-top:40px;padding-top:24px;">
    <p style="color:#7a4a4a;font-size:13px;line-height:1.6;">
      Have questions? Reach us at
      <a href="mailto:info@vivowineclub.com" style="color:#6b1a1a;">info@vivowineclub.com</a> —
      we're always happy to help.
    </p>
  </div>

  <p style="margin-top:32px;color:#bbb;font-size:11px;text-align:center;">
    Vivo Wine Club · vivowineclub.com
  </p>
</div>
`;
}

function rejectionHtml(name: string) {
  const firstName = name.split(' ')[0];
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:28px;margin-bottom:36px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" alt="Vivo Wine Club" />
  </div>

  <h2 style="text-align:center;font-weight:300;font-size:24px;margin-bottom:8px;">
    Thank you for applying, ${firstName}.
  </h2>

  <p style="line-height:1.7;color:#3a1a1a;">
    We truly appreciate your interest in Vivo Wine Club. After careful review, we're unable
    to offer you a membership at this time — our current intake is limited and we receive
    many applications.
  </p>

  <p style="line-height:1.7;color:#3a1a1a;">
    We hope to welcome you in a future round. In the meantime, you can still attend our
    open events and follow us on LinkedIn for updates.
  </p>

  <p style="text-align:center;margin:40px 0;">
    <a href="https://vivowineclub.com/events"
       style="background-color:#6b1a1a;color:white;padding:14px 32px;text-decoration:none;
              border-radius:4px;font-size:14px;letter-spacing:0.08em;">
      VIEW UPCOMING EVENTS →
    </a>
  </p>

  <p style="margin-top:32px;color:#bbb;font-size:11px;text-align:center;">
    Vivo Wine Club · vivowineclub.com
  </p>
</div>
`;
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
          from:    'noreply@vivowineclub.com',
          to:      app.email,
          subject: `Welcome to Vivo Wine Club, ${app.name.split(' ')[0]}!`,
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
          from:    'noreply@vivowineclub.com',
          to:      app.email,
          subject: 'Your Vivo Wine Club application',
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
