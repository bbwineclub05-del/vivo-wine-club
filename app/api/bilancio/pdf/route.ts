import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isFinanceUser } from '@/lib/admins';
import { generateBilancioPdf, BilancioData } from '@/lib/bilancio-pdf';

export async function POST(request: Request) {
  const authHeader  = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } =
    await getSupabaseAdmin().auth.getUser(accessToken);

  if (authError || !user || !isFinanceUser(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as BilancioData;

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
