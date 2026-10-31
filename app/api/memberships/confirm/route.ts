import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { membershipEmail } from '@/lib/emails/membership-emails';
import { notificaIscrizione } from '@/lib/emails/notifica-iscrizione';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';

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
      .select('*')
      .single();

    // Le mail partono da qui, non da chi ha creato l'iscrizione:
    // prima della conferma di Stripe non c'era niente da confermare.
    //
    // Due invii indipendenti, e di proposito: quella al socio, che è
    // il benvenuto se non l'ha mai ricevuto e la ricevuta del rinnovo
    // se ce l'ha già, e quella a noi. Se salta una, l'altra parte
    // comunque, e nessuna delle due può far fallire la conferma: il
    // pagamento è andato a buon fine, e le mail si rimandano
    // dall'area riservata.
    if (membership?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const primaVolta = !membership.welcome_sent_at;

      try {
        const { subject, html } = membershipEmail(
          primaVolta ? 'benvenuto' : 'rinnovo',
          {
            fullName: membership.full_name,
            memberId: membership.member_id,
            expiresAt: membership.expires_at,
            renewalCents: membership.offer_price_cents ?? membership.standard_price_cents,
            standardCents: membership.standard_price_cents,
            paidCents: payment.amount_cents,
          },
          membership.locale,
        );
        const { error: mailErr } = await resend.emails.send({
          from: FROM,
          to: membership.email,
          subject,
          html,
        });
        if (mailErr) {
          console.error('[memberships/confirm] mail non mandata:', mailErr.message);
        } else if (primaVolta) {
          await db
            .from('memberships')
            .update({ welcome_sent_at: new Date().toISOString() })
            .eq('id', membership.id);
        }
      } catch (e) {
        console.error('[memberships/confirm] mail non mandata:', e);
      }

      // L'avviso a noi, in entrambi i casi: una tessera nuova pagata e
      // un socio che decide di restare un altro anno sono due cose che
      // vogliamo sapere subito, non andando a cercarle nell'area
      // riservata. Si occupa da sé dei propri errori.
      await notificaIscrizione(
        resend,
        membership,
        payment.amount_cents,
        primaVolta ? 'iscrizione' : 'rinnovo',
      );
    }

    // Alla pagina di ritorno tornano solo i tre campi che mostra: la
    // riga intera contiene indirizzo di spedizione, prezzi e mail, e
    // non ha motivo di uscire dal server.
    return NextResponse.json({
      ok: true,
      membership: membership
        ? {
            member_id: membership.member_id,
            expires_at: membership.expires_at,
            full_name: membership.full_name,
          }
        : null,
    });
  } catch (err) {
    console.error('[memberships/confirm]', err);
    return NextResponse.json({ error: 'Non sono riuscito a confermare.' }, { status: 500 });
  }
}
