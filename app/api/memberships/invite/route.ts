import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { requireAdminOrStaff } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { invitoMembership, type LinguaInvito } from '@/lib/emails/invito-membership';
import { statusOf, type Membership } from '@/lib/membership';

/**
 * L'invito a diventare socio.
 *
 * Una cosa sola: un indirizzo, e parte la mail. Non crea una tessera
 * e non prenota niente — chi riceve l'invito si iscrive dal sito come
 * chiunque altro, e se non lo fa non resta in giro una riga a metà da
 * ripulire.
 *
 * Prima di mandare guarda se quell'indirizzo è già socio. Non è un
 * controllo di sicurezza: è che invitare a entrare qualcuno che è già
 * dentro fa fare una figura al club, e chi preme il pulsante non può
 * ricordarsi duecento indirizzi.
 */

export const dynamic = 'force-dynamic';

const LINGUE: LinguaInvito[] = ['it', 'en', 'fr'];

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { email?: string; lingua?: string };

    const email = String(body.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Indirizzo email non valido.' }, { status: 400 });
    }

    const lingua: LinguaInvito = LINGUE.includes(body.lingua as LinguaInvito)
      ? (body.lingua as LinguaInvito)
      : 'it';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    /* `ilike` basta a trovarlo anche con le maiuscole, ma tratta `_`
       e `%` come jolly e nelle email `_` è comune: si cerca largo e
       si confronta stretto. */
    const { data: candidati } = await db
      .from('memberships')
      .select('id, email, full_name, expires_at, cancelled_at')
      .ilike('email', email)
      .limit(10);

    const gia = (candidati ?? []).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => String(r.email ?? '').trim().toLowerCase() === email,
    );

    if (gia) {
      const stato = statusOf(gia as Membership);
      if (stato === 'active' || stato === 'expiring') {
        return NextResponse.json(
          {
            error: `${gia.full_name || email} ha già una tessera in corso. Non ho mandato niente.`,
          },
          { status: 409 },
        );
      }
    }

    const { subject, html } = invitoMembership(lingua, auth.email ?? null);

    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'Vivo Wine Club <noreply@vivowineclub.com>',
      replyTo: 'info@vivowineclub.com',
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('[memberships/invite] non mandato:', error.message);
      return NextResponse.json({ error: 'Non sono riuscito a mandare la mail.' }, { status: 502 });
    }

    console.log(`[memberships/invite] invito a ${email} (${lingua}) da ${auth.email}`);
    return NextResponse.json({ ok: true, email, lingua });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}
