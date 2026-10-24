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

    // L'indirizzo raccolto da Stripe finisce sulla tessera: è dove va
    // spedito il welcome pack. Nelle versioni recenti dell'API sta
    // dentro `collected_information`, in quelle vecchie direttamente
    // sulla sessione: si leggono entrambe perché la riga non si perda
    // al prossimo aggiornamento di Stripe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySession = session as any;
    const ship = anySession.collected_information?.shipping_details ?? anySession.shipping_details;
    const shipping = ship?.address
      ? {
          shipping_name: ship.name ?? null,
          shipping_phone: anySession.customer_details?.phone ?? null,
          shipping_line1: ship.address.line1 ?? null,
          shipping_line2: ship.address.line2 ?? null,
          shipping_city: ship.address.city ?? null,
          shipping_postal: ship.address.postal_code ?? null,
          shipping_state: ship.address.state ?? null,
          shipping_country: ship.address.country ?? null,
        }
      : {};

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
        ...shipping,
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
