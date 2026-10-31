import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';
import { daysLeft, priceFor, statusOf, type Membership } from '@/lib/membership';

/**
 * La tessera di chi sta guardando.
 *
 * La si cerca per email, non per id: molte tessere sono nate prima che
 * la persona avesse un account, e legarle a mano sarebbe un lavoro che
 * nessuno farebbe mai. Chi è entrato con quell'indirizzo è quella
 * persona.
 *
 * Il prezzo del rinnovo lo dice il server leggendo la riga: così la
 * cifra sul pulsante e quella che Stripe chiederà sono la stessa.
 */
export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    // Non `maybeSingle`: se per sbaglio esistono due tessere sullo
    // stesso indirizzo, quella chiamata fallisce e la persona si vede
    // scritto che non ha nessuna tessera — che è il contrario del
    // vero. Si prende la più recente e si va avanti.
    const { data } = await db
      .from('memberships')
      .select('*')
      .ilike('email', auth.email.trim().toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1);

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return NextResponse.json({ membership: null });

    const m = row as Membership;
    const price = priceFor(m);

    return NextResponse.json({
      membership: {
        member_id: m.member_id,
        full_name: m.full_name,
        tier: m.tier,
        started_at: m.started_at,
        expires_at: m.expires_at,
        status: statusOf(m),
        daysLeft: daysLeft(m),
      },
      renewal: {
        cents: price.cents,
        fullCents: price.fullCents,
        discounted: price.discounted,
        offerUntil: price.offerUntil,
      },
    });
  } catch (err) {
    console.error('[memberships/me]', err);
    return NextResponse.json({ error: 'Errore.' }, { status: 500 });
  }
}
