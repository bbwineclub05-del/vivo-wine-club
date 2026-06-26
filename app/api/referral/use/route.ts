import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { emailShell, heading, para, divider } from '@/lib/email-shell';
import { REWARD_THRESHOLD, randomCode } from '@/lib/referral';

const resend = new Resend(process.env.RESEND_API_KEY);


function buildRewardEmail(opts: {
  name:       string;
  eventTitle: string;
  drinkCode:  string;
}): string {
  const { name, eventTitle, drinkCode } = opts;
  const body = `
${heading('Hai sbloccato il tuo reward! 🍷', `Grazie per aver invitato 5 amici a ${eventTitle}`)}
${divider('20px 0')}
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3a1a1a;text-align:center;line-height:1.7;">
  Ciao <strong>${name}</strong>,
</p>
${para('Hai raggiunto 10 referral confermati — benissimo! Il tuo drink gratuito ti aspetta.')}
${divider('20px 0')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td style="padding:16px;text-align:center;background-color:#fdf6f6;border:1px solid #eddada;border-radius:8px;">
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#7a4a4a;">Il tuo codice drink</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#731515;letter-spacing:0.08em;">${drinkCode}</p>
    </td>
  </tr>
</table>
${para('Mostra questo codice all\'ingresso dell\'evento per ricevere il tuo drink gratuito. Valido solo per te, una volta sola.')}
`;
  return emailShell(body);
}

/**
 * POST /api/referral/use
 * Body: { ref_code, used_by_email, event_slug }
 * Records a referral use. Handles reward at REWARD_THRESHOLD uses.
 * No-self-referral, one use per person per event enforced.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const refCode     = String(body.ref_code      ?? '').trim().toUpperCase();
  const usedByEmail = String(body.used_by_email ?? '').trim().toLowerCase();
  const eventSlug   = String(body.event_slug    ?? '').trim();

  if (!refCode || !usedByEmail || !eventSlug) {
    return NextResponse.json({ error: 'ref_code, used_by_email and event_slug required' }, { status: 422 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Look up the referral code
  const { data: rc, error: rcErr } = await db
    .from('referral_codes')
    .select('id, code, event_slug, owner_email, owner_name, uses, reward_unlocked, reward_code, partner_code')
    .eq('code', refCode)
    .maybeSingle();

  if (rcErr || !rc) {
    return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
  }

  // No self-referral
  if (rc.owner_email === usedByEmail) {
    return NextResponse.json({ ok: true, skipped: 'self_referral' });
  }

  // Must match the event
  if (rc.event_slug !== eventSlug) {
    return NextResponse.json({ ok: true, skipped: 'wrong_event' });
  }

  // Insert use (unique constraint prevents duplicates silently)
  const { error: insertErr } = await db
    .from('referral_uses')
    .insert({ referral_code_id: rc.id, used_by_email: usedByEmail, event_slug: eventSlug });

  if (insertErr) {
    // Unique violation = already used → ok, not an error
    if (insertErr.code === '23505') {
      return NextResponse.json({ ok: true, skipped: 'already_used' });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Increment uses
  const newUses = rc.uses + 1;
  const updatePayload: Record<string, unknown> = { uses: newUses };

  // Generate reward at threshold (only once)
  let rewardCode: string | null = rc.reward_code ?? null;
  let justUnlocked = false;

  if (!rc.reward_unlocked && newUses >= REWARD_THRESHOLD) {
    // Generate unique DRINK code
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = randomCode('DRINK');
      const { data: collision } = await db
        .from('referral_codes')
        .select('id')
        .eq('reward_code', candidate)
        .maybeSingle();
      if (!collision) { rewardCode = candidate; break; }
    }
    updatePayload.reward_unlocked = true;
    updatePayload.reward_code     = rewardCode;
    justUnlocked = true;
  }

  await db.from('referral_codes').update(updatePayload).eq('id', rc.id);

  // Propagate partner_code to Person B's guest row (non-blocking, only if not already attributed)
  if (rc.partner_code) {
    db
      .from('event_guests')
      .update({ partner_code: rc.partner_code })
      .eq('event_slug', eventSlug)
      .eq('email', usedByEmail)
      .is('partner_code', null)
      .then(() => {/* non-fatal */})
      .catch(() => {/* non-fatal */});
  }

  // Send reward email (non-blocking)
  if (justUnlocked && rewardCode) {
    try {
      // Fetch event title for the email
      const { data: eventRow } = await db
        .from('events')
        .select('title')
        .eq('slug', eventSlug)
        .maybeSingle();

      await resend.emails.send({
        from:    'Vivo Wine Club <noreply@vivowineclub.com>',
        replyTo: 'info@vivowineclub.com',
        to:      rc.owner_email,
        subject: '🍷 Hai sbloccato il tuo drink gratuito — Vivo Wine Club',
        html:    buildRewardEmail({
          name:       rc.owner_name || rc.owner_email,
          eventTitle: eventRow?.title ?? 'Vivo Wine Club',
          drinkCode:  rewardCode,
        }),
        headers: {
          'List-Unsubscribe':      '<mailto:info@vivowineclub.com?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
    } catch (emailErr) {
      console.error('[referral/use] reward email error:', emailErr);
    }
  }

  return NextResponse.json({
    ok:              true,
    uses:            newUses,
    reward_unlocked: updatePayload.reward_unlocked ?? rc.reward_unlocked,
    reward_code:     rewardCode,
  });
}
