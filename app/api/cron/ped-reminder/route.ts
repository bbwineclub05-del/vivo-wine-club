import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { emailShell, heading, para, divider, ctaButton } from '@/lib/email-shell';

export const dynamic = 'force-dynamic';

const RECIPIENTS = [
  'elenacatellani76@gmail.com',
  'carolinamariacarra@gmail.com',
  'cristianomichelotti@gmail.com',
];

const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateIT(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = [
    'gennaio','febbraio','marzo','aprile','maggio','giugno',
    'luglio','agosto','settembre','ottobre','novembre','dicembre',
  ];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function buildHtml(entries: Record<string, string>[], dateStr: string): string {
  const dateLabel = formatDateIT(dateStr);

  const rows = entries.map((e, i) => {
    const desc  = e.description
      ? `<p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7a4a4a;line-height:1.6;" class="em-p">${e.description}</p>`
      : '';
    const notes = e.notes
      ? `<p style="margin:3px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a07070;font-style:italic;" class="em-muted">Note: ${e.notes}</p>`
      : '';
    return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #eddada;vertical-align:top;">
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:700;color:#1a0505;" class="em-h1">
          ${i + 1}. ${e.title}
        </p>
        <p style="margin:3px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a4a4a;" class="em-label">
          ${e.platform} &nbsp;&middot;&nbsp; ${e.content_type}
        </p>
        ${desc}
        ${notes}
      </td>
    </tr>`;
  }).join('');

  const body = `
${heading('Piano Editoriale', dateLabel)}
${para('Ecco i contenuti pianificati per oggi. Assicuratevi di pubblicare tutto entro la giornata.')}
${divider()}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  ${rows}
</table>
${divider('16px 0 0')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td align="center">
    ${ctaButton('VAI AL PIANO EDITORIALE →', 'https://vivowineclub.com/members#ped')}
  </td></tr>
</table>`;

  return emailShell(body);
}

export async function GET(request: Request) {
  // Security: verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-cron-secret');
    const bearer     = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (bearer !== cronSecret && cronHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const today = todayUTC();

    // Fetch today's planned entries from Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (getSupabaseAdmin() as any)
      .from('ped_entries')
      .select('id, title, platform, content_type, description, notes')
      .eq('date', today)
      .eq('status', 'planned')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ped-reminder] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries: Record<string, string>[] = data ?? [];

    if (entries.length === 0) {
      return NextResponse.json({ message: 'Nessun contenuto pianificato per oggi, email non inviata.' });
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dateLabel = formatDateIT(today);

    const { error: sendError } = await resend.emails.send({
      from:     FROM,
      replyTo: 'info@vivowineclub.com',
      to:       RECIPIENTS,
      subject:  `Vivo Wine Club — Contenuti da pubblicare oggi ${dateLabel}`,
      html:     buildHtml(entries, today),
    });

    if (sendError) {
      console.error('[ped-reminder] Resend error:', sendError);
      return NextResponse.json({ error: String(sendError) }, { status: 500 });
    }

    return NextResponse.json({
      message: `Email inviata con successo a ${RECIPIENTS.length} destinatari.`,
      entries: entries.length,
      date:    today,
    });
  } catch (err) {
    console.error('[ped-reminder] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
