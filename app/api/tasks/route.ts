import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Fetch team members from DB ────────────────────────────────────────────────
async function getTeamMembers(): Promise<{ name: string; email: string }[]> {
  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db
    .from('team_members')
    .select('name, email')
    .order('name', { ascending: true });
  return data ?? [];
}

function memberName(email: string, members: { name: string; email: string }[]) {
  return members.find((m) => m.email === email)?.name ?? email.split('@')[0];
}

// ── Email template ────────────────────────────────────────────────────────────
function taskNotificationHtml(data: {
  assignerName: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
}) {
  const priorityLabel =
    data.priority === 'high' ? '🔴 High' : data.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
  const dueLabel = data.due_date
    ? new Date(data.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'No deadline';

  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" />
  </div>
  <h2 style="margin-bottom:4px;">You have a new task.</h2>
  <p style="color:#7a4a4a;margin-top:0;">${data.assignerName} assigned you a task on Vivo Wine Club.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:24px;">
    <tr>
      <td style="padding:10px 14px;background:#f5f0f0;font-weight:600;width:120px;text-transform:uppercase;font-size:11px;color:#731515;">Task</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8d5d5;font-size:15px;font-weight:500;">${data.title}</td>
    </tr>
    ${data.description ? `
    <tr>
      <td style="padding:10px 14px;background:#f5f0f0;font-weight:600;text-transform:uppercase;font-size:11px;color:#731515;">Details</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8d5d5;white-space:pre-wrap;color:#7a4a4a;">${data.description}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:10px 14px;background:#f5f0f0;font-weight:600;text-transform:uppercase;font-size:11px;color:#731515;">Priority</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8d5d5;">${priorityLabel}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;background:#f5f0f0;font-weight:600;text-transform:uppercase;font-size:11px;color:#731515;">Due date</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8d5d5;">${dueLabel}</td>
    </tr>
  </table>
  <p style="text-align:center;margin-top:32px;">
    <a href="https://vivowineclub.com/members" style="background-color:#6b1a1a;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-size:14px;">
      VIEW TASK →
    </a>
  </p>
  <p style="margin-top:32px;color:#999;font-size:12px;text-align:center;">
    The Vivo Wine Club Team<br>info@vivowineclub.com
  </p>
</div>
`;
}

// ── GET /api/tasks ────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await db
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}

// ── POST /api/tasks ───────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, assignee_emails, assigner_email, due_date, priority, team_id } =
      body as {
        title: string;
        description?: string;
        assignee_emails: string[];
        assigner_email: string;
        due_date?: string;
        priority?: string;
        team_id?: string;
      };

    if (!title || !assigner_email || !assignee_emails?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const members = await getTeamMembers();
    const memberEmails = new Set(members.map((m) => m.email));

    // Validate assigner and all assignees are known team members
    if (!memberEmails.has(assigner_email)) {
      return NextResponse.json({ error: 'Assigner not in team' }, { status: 403 });
    }
    const unknownAssignees = assignee_emails.filter((e) => !memberEmails.has(e));
    if (unknownAssignees.length > 0) {
      return NextResponse.json({ error: `Unknown assignee(s): ${unknownAssignees.join(', ')}` }, { status: 403 });
    }

    const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await db
      .from('tasks')
      .insert({
        title,
        description:    description || null,
        assignee_email: assignee_emails[0],   // first for backward compat
        assignee_emails,                       // full array
        assigner_email,
        due_date:       due_date || null,
        priority:       priority || 'medium',
        status:         'todo',
        team_id:        team_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send notification to every assignee (fire-and-forget individually)
    const assignerName = memberName(assigner_email, members);
    for (const email of assignee_emails) {
      try {
        const result = await resend.emails.send({
          from:     'Vivo Wine Club <noreply@vivowineclub.com>',
          replyTo: 'info@vivowineclub.com',
          to:       email,
          subject:  `New task from ${assignerName}: ${title}`,
          html:    taskNotificationHtml({
            assignerName,
            title,
            description:  description || null,
            priority:     priority || 'medium',
            due_date:     due_date || null,
          }),
        });
        if (result.error) console.error('[tasks] Resend error for', email, result.error);
        else              console.log('[tasks] Notification sent to', email, result.data?.id);
      } catch (emailErr) {
        console.error('[tasks] Resend exception for', email, emailErr);
      }
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
