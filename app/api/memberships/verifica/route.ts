import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { socioInRegola } from '@/lib/soci';

/**
 * «Questa email è di un socio?»
 *
 * Serve alla pagina di acquisto di un evento riservato, per dirlo
 * prima che la persona compili tutto il modulo e scopra alla fine che
 * non può comprare. Non è il controllo che conta: quello sta nel
 * checkout, dove nessuno può scavalcarlo. Questo è solo cortesia.
 *
 * Risponde sì o no e, quando è sì, il solo nome di battesimo — serve
 * a chi scrive per capire di aver indovinato l'indirizzo giusto.
 * Cognome, scadenza e numero di tessera non escono di qui: li
 * chiederebbe solo chi sta provando indirizzi altrui.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || !email.includes('@')) {
      return NextResponse.json({ socio: false }, { status: 200 });
    }

    const socio = await socioInRegola(getSupabaseAdmin(), email);
    if (!socio) return NextResponse.json({ socio: false });

    return NextResponse.json({
      socio: true,
      nome: socio.nome?.trim().split(/\s+/)[0] ?? null,
    });
  } catch {
    return NextResponse.json({ socio: false }, { status: 200 });
  }
}
