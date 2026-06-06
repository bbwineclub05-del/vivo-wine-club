import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { generateQuotePdf } from '@/lib/quote-pdf';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const { to, subject, quoteData } = await request.json();

    const pdfBytes = await generateQuotePdf(quoteData);
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    const result = await resend.emails.send({
      from:    'Vivo Wine Club <noreply@vivowineclub.com>',
      to:      [to],
      subject: subject || `Proposta Evento — Vivo Wine Club`,
      html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#731515;padding:28px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:52px;" alt="Vivo Wine Club" />
  </div>
  <p style="margin:0 0 16px;font-size:15px;">Gentile <strong>${quoteData.clientName}</strong>,</p>
  <p style="margin:0 0 16px;color:#555;line-height:1.6;">
    In allegato trovi la nostra proposta evento / preventivo (N° ${quoteData.quoteNumber}).<br/>
    Siamo a tua disposizione per qualsiasi domanda o modifica.
  </p>
  <p style="margin:0 0 16px;color:#555;line-height:1.6;">
    A presto,<br/>
    <strong>Il team di Vivo Wine Club</strong>
  </p>
  <p style="margin-top:40px;color:#bbb;font-size:11px;text-align:center;border-top:1px solid #e8d5d5;padding-top:20px;">
    Vivo Wine Club · <a href="https://vivowineclub.com" style="color:#731515;">vivowineclub.com</a>
    · <a href="mailto:info@vivowineclub.com" style="color:#731515;">info@vivowineclub.com</a>
  </p>
</div>`,
      attachments: [{
        filename: `preventivo-${quoteData.quoteNumber}.pdf`,
        content:  pdfBase64,
      }],
    });

    if (result.error) {
      console.error('[quotes/send] Resend error:', result.error);
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[quotes/send] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
