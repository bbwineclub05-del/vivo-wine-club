import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

if (!process.env.RESEND_API_KEY) {
  console.error('[tasks] RESEND_API_KEY is missing — emails will not be sent');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMINS: Record<string, string> = {
  'cristianomichelotti@gmail.com': 'Cris',
  'filippo.lombardi513@gmail.com': 'Pippo',
  'giacomogallo1310@gmail.com':    'Jack',
  'riccardo.consalvo@icloud.com':  'Ricky',
};

function taskNotificationHtml(data: {
  assignerName: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
}) {
  const priorityLabel = data.priority === 'high' ? '🔴 High' : data.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
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

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { title, description, assignee_email, assigner_email, due_date, priority } = body as Record<string, string>;

    if (!title || !assignee_email || !assigner_email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!ADMINS[assigner_email] || !ADMINS[assignee_email]) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('tasks')
      .insert({
        title,
        description:   description || null,
        assignee_email,
        assigner_email,
        due_date:      due_date || null,
        priority:      priority || 'medium',
        status:        'todo',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send notification to assignee — awaited so Vercel doesn't kill the fn before it completes
    try {
      const emailResult = await resend.emails.send({
        from:    'noreply@vivowineclub.com',
        to:      assignee_email,
        subject: `New task from ${ADMINS[assigner_email]}: ${title}`,
        html:    taskNotificationHtml({
          assignerName: ADMINS[assigner_email],
          title,
          description:  description || null,
          priority:     priority || 'medium',
          due_date:     due_date || null,
        }),
      });
      if (emailResult.error) {
        console.error('[tasks] Resend error:', JSON.stringify(emailResult.error));
      } else {
        console.log('[tasks] Notification sent, id:', emailResult.data?.id);
      }
    } catch (emailErr) {
      console.error('[tasks] Resend exception:', emailErr);
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
