import { NextResponse } from 'next/server';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { leggiRichiestaFile } from '@/lib/richiesta-file';
import { generateQuotePdf, type QuoteData } from '@/lib/quote-pdf';

export async function POST(request: Request) {
  try {
    // Prima il corpo, poi il controllo: con un modulo il token sta
    // dentro al corpo, e il corpo si puo' leggere una volta sola.
    const { dati: data, token, inline } = await leggiRichiestaFile<QuoteData>(request);

    const auth = await requireAdminOrStaff(request, token);
    if (!auth.ok) return auth.response;

    const pdfBytes = await generateQuotePdf(data);
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="preventivo-${data.quoteNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[quotes/pdf] error:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
