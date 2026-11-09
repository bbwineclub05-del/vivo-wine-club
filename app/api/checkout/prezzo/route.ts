import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { contoPerEmail } from '@/lib/sconto-socio';
import { euroInCentesimi } from '@/lib/prezzo-evento';

/**
 * «Io quanto pago?»
 *
 * La chiama il modulo di acquisto mentre la persona scrive la sua
 * email, per mostrarle la cifra giusta prima che prema paga. Non
 * decide niente: il prezzo che conta lo rifa' il server quando crea
 * il pagamento, con la stessa funzione. Questa serve solo a non far
 * scoprire lo sconto a cose fatte.
 *
 * Risponde il totale e poco altro. In particolare non dice «questa
 * email e' di un socio» a chi non ha gia' un motivo per saperlo: se
 * l'indirizzo non e' di un socio la risposta e' identica a quella di
 * un evento senza prezzo riservato.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { slug, email, qty } = (await request.json()) as {
      slug?: string; email?: string; qty?: number;
    };

    if (!slug) return NextResponse.json({ error: 'Evento mancante.' }, { status: 400 });
    const n = Math.min(Math.max(Math.trunc(Number(qty) || 1), 1), 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data: ev } = await db
      .from('events')
      .select('price, member_price, status')
      .eq('slug', slug)
      .maybeSingle();

    if (!ev) return NextResponse.json({ error: 'Evento non trovato.' }, { status: 404 });

    const prezzoCents = euroInCentesimi(ev.price) ?? 0;
    const prezzoSocioCents = euroInCentesimi(ev.member_price);

    const conto = await contoPerEmail({
      db, slug, qty: n, prezzoCents, prezzoSocioCents,
      email: String(email ?? ''),
    });

    return NextResponse.json({
      totaleCents: conto.totaleCents,
      prezzoCents,
      prezzoSocioCents: conto.cePrezzoSocio ? prezzoSocioCents : null,
      bigliettiSocio: conto.bigliettiSocio,
      risparmioCents: conto.risparmioCents,
      giaUsato: conto.giaUsato,
    });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
