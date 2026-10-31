import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { avvisoCandidatura, candidaturaRicevuta } from '@/lib/emails/candidature-emails';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { getClientIp, PRIVACY_POLICY_VERSION } from '@/lib/consent';
import { fetchAllRows } from '@/lib/crm';

/**
 * Le candidature di chi vuole lavorare con il club.
 *
 * Una rotta sola per quattro modi di proporsi, al posto di tre rotte
 * con tre forme diverse. I campi che non riguardano il tipo scelto
 * arrivano vuoti e restano vuoti: è più semplice che avere quattro
 * tabelle da tenere allineate.
 */

export const dynamic = 'force-dynamic';

const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';
const A_NOI = 'info@vivowineclub.com';

const KINDS = ['ambassador', 'company', 'creator', 'staff'] as const;
type Kind = (typeof KINDS)[number];

/** I campi che ciascun tipo può valorizzare. */
const ALLOWED: Record<Kind, string[]> = {
  ambassador: ['first_name', 'last_name', 'phone', 'city', 'country', 'instagram', 'message'],
  company: ['first_name', 'last_name', 'phone', 'company', 'role', 'website', 'message'],
  creator: ['first_name', 'last_name', 'phone', 'city', 'instagram', 'tiktok', 'followers', 'message'],
  staff: ['first_name', 'last_name', 'phone', 'city', 'role', 'message'],
};

const text = (v: unknown, max = 2000) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

/* ── POST — pubblica: il modulo del sito ── */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const kind = body.kind as Kind;
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ error: 'Tipo di candidatura non valido.' }, { status: 400 });
    }

    const email = text(body.email, 200)?.toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Serve un indirizzo email valido.' }, { status: 400 });
    }

    if (body.consent_privacy !== true) {
      return NextResponse.json({ error: 'Serve il consenso alla privacy.' }, { status: 400 });
    }

    // Solo i campi che hanno senso per il tipo scelto: così un creator
    // non può finire con una ragione sociale e un'azienda con i
    // follower, e chi legge la riga sa che cosa aspettarsi.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = {
      kind,
      email,
      locale: text(body.locale, 8) ?? 'it',
      consent_privacy_accepted_at: new Date().toISOString(),
      consent_privacy_version: PRIVACY_POLICY_VERSION,
      consent_marketing: body.consent_marketing === true,
    };
    for (const field of ALLOWED[kind]) {
      if (field === 'followers') {
        const n = Number(body.followers);
        row.followers = Number.isFinite(n) && n > 0 ? Math.round(n) : null;
      } else {
        row[field] = text(body[field], field === 'message' ? 4000 : 300);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { error } = await db.from('collaboration_applications').insert(row);
    if (error) {
      console.error('[collaboration-applications]', error);
      return NextResponse.json({ error: 'Non sono riuscito a salvare.' }, { status: 500 });
    }

    // L'IP si legge ma non si salva su questa tabella: serviva solo a
    // dimostrare il consenso, e la data con la versione della privacy
    // lo dimostrano già senza tenersi un dato personale in più.
    void getClientIp(request);

    // Due mail: la conferma a chi si è proposto, nella sua lingua, e
    // l'avviso a noi. Prima non partiva niente, e una candidatura si
    // vedeva solo entrando nell'area riservata a cercarla.
    //
    // Nessuna delle due può far fallire la candidatura: la riga è già
    // salvata, e perderla perché un invio è andato storto sarebbe il
    // modo peggiore di gestire l'errore. Partono in parallelo, perché
    // una non dipende dall'altra.
    const resend = new Resend(process.env.RESEND_API_KEY);
    const conferma = candidaturaRicevuta(row);
    const avviso = avvisoCandidatura(row);
    const esiti = await Promise.allSettled([
      resend.emails.send({
        from: FROM,
        replyTo: A_NOI,
        to: email,
        subject: conferma.subject,
        html: conferma.html,
      }),
      resend.emails.send({
        from: FROM,
        to: A_NOI,
        subject: avviso.subject,
        html: avviso.html,
      }),
    ]);
    esiti.forEach((esito, i) => {
      const quale = i === 0 ? 'conferma al candidato' : 'avviso a noi';
      if (esito.status === 'rejected') {
        console.error(`[collaboration-applications] ${quale} non mandata:`, esito.reason);
      } else if (esito.value.error) {
        console.error(`[collaboration-applications] ${quale} non mandata:`, esito.value.error.message);
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }
}

/* ── GET — riservata: l'elenco per l'area ── */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const rows = await fetchAllRows(getSupabaseAdmin(), (q) =>
      q
        .from('collaboration_applications')
        .select('*')
        .order('created_at', { ascending: false }),
    );
    return NextResponse.json({ applications: rows });
  } catch (err) {
    console.error('[collaboration-applications GET]', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
