/**
 * Supabase Edge Function: birthday-wishes
 *
 * Schedule: daily at 09:00 UTC via Supabase cron
 * (set in Supabase Dashboard → Edge Functions → Schedule,
 *  or via supabase/config.toml with `[functions.birthday-wishes] schedule = "0 9 * * *"`)
 *
 * For each applicant whose birthday is today:
 *  1. Generate a unique discount code  BDAY-{FIRSTNAME}-{YEAR}-{RANDOM6}
 *  2. Insert into `discount_codes` table (7-day expiry, 20% off)
 *  3. Send a birthday email via Resend
 *
 * Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY      = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(firstName: string, year: number): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const name   = firstName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12);
  return `BDAY-${name}-${year}-${random}`;
}

function birthdayEmailHtml(firstName: string, code: string, expiresAt: Date): string {
  const formatted = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" alt="Vivo Wine Club" />
  </div>

  <h2 style="text-align:center;font-weight:300;font-size:28px;margin-bottom:8px;">
    Happy birthday, ${firstName}! 🎂
  </h2>
  <p style="text-align:center;color:#7a4a4a;font-style:italic;margin-bottom:32px;">
    From the Vivo Wine Club team, with love.
  </p>

  <p style="line-height:1.7;">
    To celebrate your birthday, we're giving you an exclusive <strong>20% discount</strong>
    on all Vivo merch and event tickets. Use the code below at checkout:
  </p>

  <div style="text-align:center;margin:32px 0;">
    <div style="display:inline-block;background:#f5eded;border:1.5px dashed #731515;padding:16px 32px;border-radius:4px;">
      <span style="font-family:monospace;font-size:22px;font-weight:700;color:#731515;letter-spacing:0.1em;">
        ${code}
      </span>
    </div>
    <p style="margin-top:12px;font-size:12px;color:#999;">
      Valid until ${formatted} · Single use only
    </p>
  </div>

  <p style="line-height:1.7;color:#7a4a4a;font-size:14px;">
    Enter the code in your cart before proceeding to payment.
    The discount will be applied automatically.
  </p>

  <div style="text-align:center;margin-top:32px;">
    <a href="https://vivowineclub.com/wear-the-club"
       style="background-color:#731515;color:white;padding:14px 28px;text-decoration:none;border-radius:2px;font-size:12px;letter-spacing:0.2em;display:inline-block;">
      SHOP NOW →
    </a>
  </div>

  <p style="margin-top:40px;color:#aaa;font-size:11px;text-align:center;line-height:1.6;">
    The Vivo Wine Club Team<br>
    info@vivowineclub.com · vivowineclub.com
  </p>
</div>
`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const today = new Date();
  const todayMonth = today.getMonth() + 1; // 1–12
  const todayDay   = today.getDate();       // 1–31
  const year       = today.getFullYear();

  // Fetch all applicants who have a date_of_birth set
  const { data: applicants, error } = await supabase
    .from('applications')
    .select('id, name, email, date_of_birth')
    .not('date_of_birth', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Filter to those whose birthday is today
  const birthdays = (applicants ?? []).filter((a) => {
    const dob = new Date(a.date_of_birth as string);
    return (dob.getMonth() + 1) === todayMonth && dob.getDate() === todayDay;
  });

  const results: { email: string; code: string; status: string }[] = [];

  for (const applicant of birthdays) {
    const firstName  = (applicant.name as string).split(' ')[0];
    const code       = generateCode(firstName, year);
    const expiresAt  = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Insert discount code
    const { error: insertError } = await supabase.from('discount_codes').insert({
      code,
      user_email:       applicant.email,
      discount_percent: 20,
      used:             false,
      expires_at:       expiresAt.toISOString(),
    });

    if (insertError) {
      results.push({ email: applicant.email as string, code, status: `db_error: ${insertError.message}` });
      continue;
    }

    // Send birthday email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'noreply@vivowineclub.com',
        to:      applicant.email,
        subject: 'Happy birthday from Vivo Wine Club! 🎂',
        html:    birthdayEmailHtml(firstName, code, expiresAt),
      }),
    });

    results.push({
      email:  applicant.email as string,
      code,
      status: emailRes.ok ? 'sent' : `email_error: ${emailRes.status}`,
    });
  }

  return new Response(
    JSON.stringify({ processed: birthdays.length, results }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
