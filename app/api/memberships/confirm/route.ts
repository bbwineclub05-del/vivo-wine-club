import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Conferma il pagamento di una tessera al ritorno da Stripe.
 *
 * Si chiede a Stripe se quella sessione è stata pagata davvero: il
 * fatto che il browser sia tornato sulla pagina di successo non
 * dimostra niente, perché quell'indirizzo lo può aprire chiunque.
 *
 * Idempotente: la riga del pagamento è legata alla sessione da un
 * indice unico, e se risulta già pagata non si fa niente. Ricaricare
 * la pagina di ritorno non deve spostare la scadenza di un altro anno.
 */
export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Manca la sessione.' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (session.metadata?.type !== 'membership') {
      return NextResponse.json({ error: 'Sessione non valida.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const { data: payment } = await db
      .from('membership_payments')
      .select('*')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento non trovato.' }, { status: 404 });
    }

    // Già confermato: si risponde com'è andata, senza rifare niente.
    if (payment.status === 'paid') {
      const { data: m } = await db
        .from('memberships')
        .select('member_id, expires_at, full_name')
        .eq('id', payment.membership_id)
        .maybeSingle();
      return NextResponse.json({ ok: true, alreadyConfirmed: true, membership: m });
    }

    if (session.payment_status !== 'paid') {
      await db
        .from('membership_payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
      return NextResponse.json({ error: 'Il pagamento non risulta completato.' }, { status: 402 });
    }

    await db
      .from('membership_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payment.id);

    // La scadenza si sposta, e i promemaria dell'anno appena chiuso si
    // azzerano: l'anno prossimo vanno rimandati da capo.
    const { data: membership } = await db
      .from('memberships')
      .update({
        expires_at: payment.period_end,
        reminded_30_at: null,
        reminded_7_at: null,
        reminded_0_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.membership_id)
      .select('member_id, expires_at, full_name, email')
      .single();

    return NextResponse.json({ ok: true, membership });
  } catch (err) {
    console.error('[memberships/confirm]', err);
    return NextResponse.json({ error: 'Non sono riuscito a confermare.' }, { status: 500 });
  }
}
