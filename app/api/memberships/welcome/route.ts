import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { preparaAccessoSocio } from '@/lib/member-access';
import { membershipEmail, type MembershipEmailKind } from '@/lib/emails/membership-emails';
import { priceFor, type Membership } from '@/lib/membership';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';

/**
 * Manda il benvenuto a una tessera che esiste già.
 *
 * Serve per i soci di prima, che la tessera ce l'hanno ma non hanno
 * mai ricevuto niente. Si manda una per una, o a un elenco preciso di
 * numeri di tessera: niente "manda a tutti" — su una mail che parte
 * davvero, il pulsante che fa partire trecento invii è il modo più
 * rapido per fare un danno irreparabile.
 *
 * Resta scritto quando è partita: la seconda volta non riparte, a
 * meno che non si chieda apposta.
 */
export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.membershipIds) ? body.membershipIds : [];
    const forza = body.force === true;
    // Due mail diverse: "attivazione" per i soci di prima, "benvenuto"
    // per chi arriva da zero. Si sceglie, non si indovina.
    const kind: MembershipEmailKind = body.kind === 'benvenuto' ? 'benvenuto' : 'attivazione';

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Nessuna tessera indicata.' }, { status: 400 });
    }
    if (ids.length > 50) {
      return NextResponse.json({ error: 'Massimo cinquanta per volta.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { data: rows } = await db.from('memberships').select('*').in('id', ids);

    const esiti: { email: string; esito: string }[] = [];

    for (const row of (rows ?? []) as Membership[] & { welcome_sent_at?: string | null }[]) {
      const m = row as Membership & { welcome_sent_at?: string | null };

      if (m.cancelled_at) { esiti.push({ email: m.email, esito: 'tessera annullata' }); continue; }
      if (m.welcome_sent_at && !forza) { esiti.push({ email: m.email, esito: 'già mandata' }); continue; }

      const price = priceFor(m);

      // L'accesso prima della mail: se l'account non c'è si crea, se
      // c'è gli si mette il timbro del ruolo, e se la password non è
      // mai stata scelta torna l'indirizzo per scegliersela. Senza
      // questo passo la mail manda a una pagina di login dove la
      // persona non ha niente da inserire.
      //
      // Se qui qualcosa va storto la mail non parte: mandare un
      // benvenuto che porta in un vicolo cieco è peggio che non
      // mandarlo, e `welcome_sent_at` resta vuoto, quindi si può
      // riprovare senza perdere il conto.
      let accesso;
      try {
        accesso = await preparaAccessoSocio(db, m.email, m.full_name);
      } catch (e) {
        esiti.push({
          email: m.email,
          esito: `accesso non preparato: ${e instanceof Error ? e.message : 'errore'}`,
        });
        continue;
      }

      // Nella lingua della persona: quella salvata all'iscrizione, o
      // l'italiano per chi è entrato prima che la chiedessimo.
      const { subject, html } = membershipEmail(
        kind,
        {
          fullName: m.full_name,
          memberId: m.member_id,
          expiresAt: m.expires_at,
          renewalCents: price.cents,
          standardCents: price.fullCents,
          passwordLink: accesso.link,
          haPassword: accesso.haPassword,
        },
        (m as Membership & { locale?: string | null }).locale,
      );

      try {
        const { error } = await resend.emails.send({ from: FROM, to: m.email, subject, html });
        if (error) throw new Error(error.message);
        await db
          .from('memberships')
          .update({ welcome_sent_at: new Date().toISOString() })
          .eq('id', m.id);
        esiti.push({
          email: m.email,
          esito: accesso.haPassword ? 'mandata' : `mandata, con link password (${accesso.nota})`,
        });
      } catch (e) {
        esiti.push({ email: m.email, esito: e instanceof Error ? e.message : 'invio fallito' });
      }
    }

    return NextResponse.json({
      mandate: esiti.filter((e) => e.esito === 'mandata').length,
      esiti,
    });
  } catch (err) {
    console.error('[memberships/welcome]', err);
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
