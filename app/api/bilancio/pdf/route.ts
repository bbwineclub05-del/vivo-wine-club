import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isFinanceUser } from '@/lib/admins';
import { leggiRichiestaFile } from '@/lib/richiesta-file';
import { generateBilancioPdf, BilancioData } from '@/lib/bilancio-pdf';

export async function POST(request: Request) {
  // Il corpo si legge per primo: quando il pulsante manda un modulo,
  // il token sta li' dentro insieme ai dati.
  const { dati: body, token } = await leggiRichiestaFile<BilancioData>(request);

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } =
    await getSupabaseAdmin().auth.getUser(token);

  if (authError || !user || !isFinanceUser(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pdfBytes = await generateBilancioPdf(body);
  const buffer   = Buffer.from(pdfBytes);

  const filename = `bilancio-${(body.periodLabel ?? 'export').replace(/\s+/g, '-').toLowerCase()}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
