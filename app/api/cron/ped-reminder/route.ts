import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const RECIPIENTS = [
  'elenacatellani76@gmail.com',
  'carolinamariacarra@gmail.com',
  'cristianomichelotti@gmail.com',
];

const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';

const PLATFORM_EMOJI: Record<string, string> = {
  Instagram: '📸',
  LinkedIn:  '💼',
  TikTok:    '🎵',
  Facebook:  '📘',
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
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
    const emoji = PLATFORM_EMOJI[e.platform] ?? '📌';
    const desc  = e.description ? `<p style="margin:6px 0 0;color:#555;font-size:14px;">${e.description}</p>` : '';
    const notes = e.notes       ? `<p style="margin:4px 0 0;color:#888;font-size:13px;font-style:italic;">Note: ${e.notes}</p>` : '';
    return `
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #f0e8e0;vertical-align:top;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:22px;line-height:1;">${emoji}</span>
            <div style="flex:1;">
              <p style="margin:0;font-size:16px;font-weight:600;color:#5c1a1a;">
                ${i + 1}. ${e.title}
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#8b4513;">
                <strong>${e.platform}</strong> &nbsp;·&nbsp; ${e.content_type}
              </p>
              ${desc}
              ${notes}
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f7f0e8;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f0e8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(92,26,26,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:#5c1a1a;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:3px;color:#e8c9a0;text-transform:uppercase;">Piano Editoriale</p>
              <h1 style="margin:8px 0 0;font-size:26px;color:#fff;font-weight:400;letter-spacing:1px;">Contenuti di oggi</h1>
              <p style="margin:8px 0 0;font-size:15px;color:#e8c9a0;">${dateLabel}</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:28px 40px 8px;color:#3a2a1a;font-size:15px;line-height:1.7;">
              Ciao team! 👋<br/>
              Ecco i contenuti pianificati per oggi. Assicuratevi di pubblicare tutto entro la giornata.
            </td>
          </tr>

          <!-- Entries -->
          <tr>
            <td style="padding:16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e0;border-radius:8px;overflow:hidden;">
                ${rows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <a href="https://vivowineclub.com/members#ped"
                 style="display:inline-block;background:#5c1a1a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
                Vai al Piano Editoriale
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7f0e8;padding:20px 40px;text-align:center;border-top:1px solid #e8d5c0;">
              <p style="margin:0;font-size:12px;color:#a08060;line-height:1.6;">
                Vivo Wine Club · Reminder automatico<br/>
                Questo messaggio è stato generato automaticamente, non rispondere a questa email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      from:    FROM,
      to:      RECIPIENTS,
      subject: `Vivo Wine Club — Contenuti da pubblicare oggi ${dateLabel}`,
      html:    buildHtml(entries, today),
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
