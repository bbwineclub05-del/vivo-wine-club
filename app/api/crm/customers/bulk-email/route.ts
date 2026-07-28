import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';

// Large recipient lists need several sequential batch calls (100/batch) to
// Resend — without this, Vercel's default serverless timeout (as low as 10s)
// kills the function partway through, silently dropping every batch after
// the cutoff.
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  console.error('[crm/customers/bulk-email] RESEND_API_KEY missing');
}

/** Split array into chunks of at most `size` elements */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

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
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { recipients, subject, text } = body as {
    recipients: Array<{ email: string; name: string }>;
    subject: string;
    text: string;
  };

  if (!recipients?.length || !subject || !text) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const tag = `[crm/customers/bulk-email total=${recipients.length}]`;
  console.log(`${tag} start — subject="${subject}"`);

  // Build one personalised payload per recipient
  const payloads = recipients.map(({ email, name }) => {
    const firstName = name.split(' ')[0] || name;
    const personalised = text
      .replace(/\[Nome\]/g, firstName)
      .replace(/\[Name\]/g, firstName)
      .replace(/\[Prénom\]/g, firstName);
    return {
      from:    'Vivo Wine Club <noreply@vivowineclub.com>' as const,
      replyTo: 'info@vivowineclub.com',
      to:      `${name} <${email}>`,
      subject,
      html:    buildHtml(personalised),
      headers: {
        'List-Unsubscribe': '<mailto:info@vivowineclub.com?subject=Unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };
  });

  // Batch send (max 100 per Resend batch call) — avoids 10 req/sec per-call rate limit
  const BATCH_SIZE = 100;
  const batches    = chunk(payloads, BATCH_SIZE);

  let sent = 0;
  let failed = 0;
  const failedEmails: { email: string; error: string }[] = [];

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    console.log(`${tag} batch ${bi + 1}/${batches.length} — ${batch.length} emails`);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (resend.batch as any).send(batch);
      if (result.error) {
        console.error(`${tag} batch ${bi + 1} FAILED:`, JSON.stringify(result.error));
        for (const p of batch) {
          failedEmails.push({ email: p.to as string, error: result.error.message ?? 'Batch error' });
          failed++;
        }
      } else {
        const batchSent = Array.isArray(result.data) ? result.data.length : batch.length;
        sent += batchSent;
        console.log(`${tag} batch ${bi + 1} OK — ${batchSent} queued`);
      }
    } catch (batchErr) {
      console.error(`${tag} batch ${bi + 1} exception:`, batchErr);
      for (const p of batch) {
        failedEmails.push({ email: p.to as string, error: batchErr instanceof Error ? batchErr.message : 'Unknown error' });
        failed++;
      }
    }
  }

  console.log(`${tag} done — sent=${sent} failed=${failed}`);

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: recipients.length,
    failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
  });
}
