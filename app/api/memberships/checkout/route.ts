import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { nextExpiry, priceFor, type Membership } from '@/lib/membership';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Il pagamento della tessera: primo anno o rinnovo.
 *
 * Pagamento singolo, come i biglietti degli eventi, non un abbonamento
 * che addebita da solo. Per qualche decina di soci all'anno gli
 * abbonamenti vorrebbero webhook, gestione dei pagamenti falliti e
 * delle carte scadute: molta macchina per poco. E un rinnovo esplicito
 * è più gentile di un addebito silenzioso.
 *
 * Il prezzo non arriva dal browser: lo decide il server leggendo la
 * riga della persona. Altrimenti chiunque potrebbe aprire gli
 * strumenti per sviluppatori e rinnovare per un euro.
 */
export async function POST(request: Request) {
  try {
    const { membershipId, email } = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const query = db.from('memberships').select('*');
    const { data: membership } = membershipId
      ? await query.eq('id', membershipId).maybeSingle()
      : await query.ilike('email', String(email ?? '').trim().toLowerCase()).maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Tessera non trovata.' }, { status: 404 });
    }
    if (membership.cancelled_at) {
      return NextResponse.json({ error: 'Questa tessera è stata annullata.' }, { status: 400 });
    }

    const price = priceFor(membership as Membership);
    const periodStart = membership.expires_at;
    const periodEnd = nextExpiry(membership as Membership);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: membership.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: price.cents,
            product_data: {
              name: `Membership VIVO Wine Club — ${periodEnd.slice(0, 4)}`,
              description: price.discounted
                ? `Rinnovo anticipato${membership.member_id ? ` · tessera ${membership.member_id}` : ''}`
                : `Tessera annuale${membership.member_id ? ` · ${membership.member_id}` : ''}`,
            },
          },
        },
      ],
      success_url:
        'https://vivowineclub.com/membership/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://vivowineclub.com/membership',
      billing_address_collection: 'required',
      metadata: {
        type: 'membership',
        membership_id: membership.id,
        period_start: periodStart,
        period_end: periodEnd,
        amount_cents: String(price.cents),
      },
    });

    // La riga del pagamento nasce ora, in attesa: se la persona non
    // completa il checkout resta 'pending' e si vede che ci ha provato,
    // invece di non lasciare traccia.
    await db.from('membership_payments').insert({
      membership_id: membership.id,
      amount_cents: price.cents,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'pending',
      stripe_session_id: session.id,
    });

    return NextResponse.json({ url: session.url, amountCents: price.cents });
  } catch (err) {
    console.error('[memberships/checkout]', err);
    return NextResponse.json({ error: 'Non sono riuscito ad aprire il pagamento.' }, { status: 500 });
  }
}
