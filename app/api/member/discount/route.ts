import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/auth-guard';
import { statusOf, type Membership } from '@/lib/membership';

/**
 * Il codice sconto del socio: 15% sul merch, finché vale la tessera.
 *
 * Personale e legato all'email, non uno condiviso: un codice unico
 * per tutti finirebbe su un gruppo WhatsApp in una settimana e lo
 * sconto riservato non sarebbe più riservato. Non si consuma — vale
 * per tutti gli acquisti dell'anno — e scade con la tessera, che è il
 * modo più onesto di dire che è un vantaggio della membership.
 *
 * Si crea alla prima richiesta e poi resta quello: niente pulsante
 * "genera", nessuna scelta da fare.
 */

const SCONTO_SOCI = 15;

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const email = auth.email.trim().toLowerCase();

    // Senza tessera valida non c'è sconto: è il vantaggio di essere soci.
    const { data: rows } = await db
      .from('memberships')
      .select('*')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    const membership = (Array.isArray(rows) ? rows[0] : null) as Membership | null;
    if (!membership || statusOf(membership) === 'expired' || statusOf(membership) === 'cancelled') {
      return NextResponse.json({ code: null, reason: 'no-membership' });
    }

    const { data: esistente } = await db
      .from('discount_codes')
      .select('code, discount_percent, expires_at, uses')
      .ilike('user_email', email)
      .eq('reusable', true)
      .maybeSingle();

    if (esistente) {
      return NextResponse.json({
        code: esistente.code,
        percent: esistente.discount_percent,
        expiresAt: esistente.expires_at,
        uses: esistente.uses ?? 0,
      });
    }

    // Il codice porta dentro il numero di tessera: chi lo legge sa di
    // chi è, e chi lo riceve da un amico si vede rifiutare l'acquisto.
    const coda = (membership.member_id ?? '').replace('VIVO-', '') || Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `SOCI15-${coda}`;

    const { data: creato, error } = await db
      .from('discount_codes')
      .insert({
        code,
        user_email: email,
        discount_percent: SCONTO_SOCI,
        used: false,
        reusable: true,
        expires_at: `${membership.expires_at.slice(0, 10)}T23:59:59Z`,
      })
      .select('code, discount_percent, expires_at, uses')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      code: creato.code,
      percent: creato.discount_percent,
      expiresAt: creato.expires_at,
      uses: 0,
    });
  } catch (err) {
    console.error('[member/discount]', err);
    return NextResponse.json({ error: 'Errore.' }, { status: 500 });
  }
}
