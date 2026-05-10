import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

const VALID_STATUSES = ['todo', 'in_progress', 'done'];

const ADMINS: Record<string, string> = {
  'cristianomichelotti@gmail.com': 'Cris',
  'filippo.lombardi890@gmail.com': 'Pippo',
  'giacomogallo1310@gmail.com':    'Jack',
  'riccardo.consalvo@icloud.com':  'Ricky',
};

function taskDoneHtml(data: {
  assigneeName: string;
  title: string;
  description: string | null;
  due_date: string | null;
}) {
  const dueLabel = data.due_date
    ? new Date(data.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" />
  </div>
  <h2 style="margin-bottom:4px;">Task completed. ✓</h2>
  <p style="color:#7a4a4a;margin-top:0;">${data.assigneeName} marked a task as <strong>done</strong>.</p>
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
    ${dueLabel ? `
    <tr>
      <td style="padding:10px 14px;background:#f5f0f0;font-weight:600;text-transform:uppercase;font-size:11px;color:#731515;">Due date</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8d5d5;">${dueLabel}</td>
    </tr>` : ''}
  </table>
  <p style="text-align:center;margin-top:32px;">
    <a href="https://vivowineclub.com/members" style="background-color:#6b1a1a;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-size:14px;">
      VIEW TASK BOARD →
    </a>
  </p>
  <p style="margin-top:32px;color:#999;font-size:12px;text-align:center;">
    The Vivo Wine Club Team<br>info@vivowineclub.com
  </p>
</div>
`;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send "task done" notification to assigner — awaited so Vercel doesn't kill the fn early
  if (status === 'done' && data.assigner_email !== data.assignee_email) {
    const assigneeName = ADMINS[data.assignee_email] ?? data.assignee_email;
    try {
      const emailResult = await resend.emails.send({
        from:    'noreply@vivowineclub.com',
        to:      data.assigner_email,
        subject: `✓ Task completed by ${assigneeName}: ${data.title}`,
        html:    taskDoneHtml({
          assigneeName,
          title:       data.title,
          description: data.description ?? null,
          due_date:    data.due_date ?? null,
        }),
      });
      if (emailResult.error) {
        console.error('[tasks/done] Resend error:', JSON.stringify(emailResult.error));
      } else {
        console.log('[tasks/done] Done-notification sent, id:', emailResult.data?.id);
      }
    } catch (emailErr) {
      console.error('[tasks/done] Resend exception:', emailErr);
    }
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
