import { NextResponse } from 'next/server';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { generateQuotePdf } from '@/lib/quote-pdf';

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const data = await request.json();
    const pdfBytes = await generateQuotePdf(data);
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="preventivo-${data.quoteNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[quotes/pdf] error:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
