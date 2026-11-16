import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';

/**
 * GET /api/crm/members — chi ha un account, e che rapporto ha col club.
 *
 * Questa rotta interrogava `tickets.buyer_email` e `tickets.ticket_count`:
 * due colonne che non esistono. La query falliva a ogni chiamata,
 * l'errore finiva in un `console.error` e la pagina proseguiva come se
 * niente fosse — mostrando ogni membro con zero eventi e zero spesa.
 * Un numero sbagliato scritto con sicurezza è peggio di un numero
 * mancante, perché nessuno va a controllarlo.
 *
 * Le colonne vere sono `email` e una riga per biglietto. Si contano
 * solo i biglietti pagati: quelli in sospeso non sono soldi incassati.
 */
export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    // ── Gli eventi, per titolo e prezzo ──
    const events = await fetchAllRows<{ slug: string; title: string | null; price: number | null }>(
      db,
      (q) => q.from('events').select('slug, title, price').order('slug', { ascending: true }),
    );
    const PRICE: Record<string, number> = {};
    const TITLE: Record<string, string> = {};
    for (const e of events) {
      PRICE[e.slug] = e.price ?? 0;
      TITLE[e.slug] = e.title ?? e.slug;
    }

    // ── Gli account ──
    const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 200) break;
    }

    // ── I profili: è qui che vive la membership vera ──
    const profiles = await fetchAllRows<{
      id: string; full_name: string | null; city: string | null;
      member_id: string | null; tier: string | null; member_since: number | null; phone: string | null;
    }>(db, (q) =>
      q
        .from('profiles')
        .select('id, full_name, city, member_id, tier, member_since, phone')
        .order('created_at', { ascending: true }),
    );
    const byId = new Map(profiles.map((p) => [p.id, p]));

    /* Il telefono e la citta' stanno in due posti.
     *
     * `profiles` e' la scheda di chi ha un account, e li' dentro il
     * telefono ce l'hanno in sei su ventotto: nessuno lo chiede al
     * momento di registrarsi. `memberships` invece e' il modulo di
     * iscrizione al club, che il telefono lo chiede, e li' ce l'hanno
     * in quarantanove su cinquantasette.
     *
     * Il CRM guardava solo il primo posto, quindi mostrava un trattino
     * a quasi tutti pur avendo il numero a due tabelle di distanza.
     * Adesso guarda tutti e due, e vince quello che c'e'.
     */
    const anagrafiche = await fetchAllRows<{
      email: string; phone: string | null; city: string | null;
      member_id: string | null; expires_at: string; cancelled_at: string | null;
    }>(db, (q) => q.from('memberships').select('email, phone, city, member_id, expires_at, cancelled_at'));

    const perEmail = new Map(
      anagrafiche.map((m) => [String(m.email ?? '').trim().toLowerCase(), m]),
    );

    /* Chi e' socio, e chi lo e' soltanto nei ricordi.
     *
     * Fino a ieri questa pagina leggeva `profiles.tier`, una parola
     * scritta a mano quando "essere socio" non era ancora una tessera
     * con una scadenza. E' rimasta ferma a prima di ottobre:
     * quarantadue persone etichettate "Registrato" avevano la tessera
     * attiva, e il CRM le chiamava registrate.
     *
     * Adesso la domanda e' la stessa che si fa il resto del sito: ha
     * una tessera non scaduta e non annullata? Non si legge piu' un
     * campo, si guarda un fatto.
     *
     * Lo staff resta a parte perche' e' un ruolo, non un livello di
     * tessera: uno dello staff puo' benissimo essere anche socio, e
     * mescolarli vorrebbe dire perdere l'uno o l'altro.
     */
    const oggi = new Date().toISOString().slice(0, 10);
    const socio = (email: string) => {
      const m = perEmail.get(email);
      return !!m && !m.cancelled_at && String(m.expires_at ?? '').slice(0, 10) >= oggi;
    };

    const staff = new Set(
      (await fetchAllRows<{ email: string; active: boolean | null }>(db, (q) =>
        q.from('team_members').select('email, active'),
      ))
        .filter((t) => t.active !== false)
        .map((t) => String(t.email ?? '').trim().toLowerCase()),
    );

    // ── I biglietti, solo quelli pagati ──
    const tickets = await fetchAllRows<{
      email: string | null; event_id: string | null; payment_status: string | null;
    }>(db, (q) =>
      q
        .from('tickets')
        .select('email, event_id, payment_status')
        .order('created_at', { ascending: true }),
    );

    const byEmail: Record<string, { events: string[]; spend: number; tickets: number }> = {};
    for (const t of tickets) {
      if (t.payment_status !== 'paid') continue;
      const email = (t.email ?? '').trim().toLowerCase();
      if (!email) continue;
      const row = (byEmail[email] ??= { events: [], spend: 0, tickets: 0 });
      const title = TITLE[t.event_id ?? ''] ?? t.event_id ?? '';
      if (title && !row.events.includes(title)) row.events.push(title);
      row.spend += PRICE[t.event_id ?? ''] ?? 0;
      row.tickets += 1;
    }

    const members = users.map((u) => {
      const email = (u.email ?? '').trim().toLowerCase();
      const p = byId.get(u.id);
      const t = byEmail[email] ?? { events: [], spend: 0, tickets: 0 };
      return {
        id: u.id,
        email: u.email ?? '',
        name: p?.full_name?.trim() || u.email?.split('@')[0] || 'Senza nome',
        city: p?.city?.trim() || perEmail.get(email)?.city?.trim() || null,
        phone: p?.phone?.trim() || perEmail.get(email)?.phone?.trim() || null,
        member_id: p?.member_id ?? perEmail.get(email)?.member_id ?? null,
        member_since: p?.member_since ?? null,
        // Non più l'etichetta scritta a mano: la tessera che c'è o non c'è.
        tier: socio(email) ? 'Socio' : null,
        staff: staff.has(email),
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at ?? null,
        events: t.events,
        tickets: t.tickets,
        spend: t.spend,
      };
    });

    members.sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));

    return NextResponse.json({
      members,
      total: members.length,
      // Quanti eventi hanno un prezzo in anagrafica: la spesa è
      // calcolabile solo su quelli.
      pricedEvents: events.filter((e) => (e.price ?? 0) > 0).length,
      totalEvents: events.length,
    });
  } catch (err) {
    console.error('[crm/members]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
