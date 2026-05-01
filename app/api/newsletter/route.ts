import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

const WELCOME_HTML = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:64px;" />
  </div>
  <h2 style="text-align:center;">You're on the list.</h2>
  <p style="text-align:center;">Good wine. Good music. Good people.</p>
  <p>You will be the first to hear about our exclusive events, winery visits and curated wine experiences.</p>
  <p style="margin-top:32px;color:#999;font-size:12px;text-align:center;">
    The Vivo Wine Club Team<br>
    info@vivowineclub.com<br>
    vivowineclub.com
  </p>
</div>
`;

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Save to Supabase (ignore unique-violation — already subscribed is fine)
  const { error: dbError } = await supabase
    .from('subscribers')
    .insert({ email });

  if (dbError && dbError.code !== '23505') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Send welcome email (fire and don't fail the request on email error)
  await resend.emails.send({
    from: 'noreply@vivowineclub.com',
    to: email,
    subject: 'Welcome to Vivo Wine Club Newsletter',
    html: WELCOME_HTML,
  });

  return NextResponse.json({ ok: true });
}
