import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { fetchAllRows } from '@/lib/crm';

/**
 * I numeri del club.
 *
 * Rispondono a tre domande, e solo a quelle: quanto entra, come vanno
 * gli eventi, come cresce il pubblico. Quello che c'era prima ne
 * rispondeva a molte di più, spesso male — due riquadri identici
 * chiamati "tickets sold" e "partecipanti", una percentuale di
 * approvazione delle candidature che non vuol dire più niente da
 * quando la tessera si compra, e soprattutto tre letture ferme a mille
 * righe su 1184 ospiti e 1413 contatti: il pannello dichiarava 1000
 * persone perché PostgREST smette di rispondere lì.
 *
 * Una persona è un'email. Chi si iscrive in lista e poi compra il
 * biglietto è una persona sola, non due.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

const MONTHS_BACK = 12;
const DAY = 86_400_000;

interface TicketRow {
  event_id: string | null;
  email: string | null;
  checked_in: boolean | null;
  created_at: string;
  partner_code: string | null;
  consent_marketing: boolean | null;
}

interface GuestRow {
  event_slug: string | null;
  email: string | null;
  checked_in: boolean | null;
  created_at: string;
  partner_code: string | null;
  consent_marketing: boolean | null;
}

interface EventRow {
  slug: string;
  title: string | null;
  date: string | null;
  price: number | null;
  capacity: number | null;
  published: boolean | null;
}

/** Una persona è un'email. Senza email, è una riga che vale per sé. */
function personKey(email: string | null, fallback: string): string {
  const clean = (email ?? '').trim().toLowerCase();
  return clean || `#anonimo-${fallback}`;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  return new Date(`${key}-01T12:00:00Z`).toLocaleDateString('it-IT', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

/** Gli ultimi N mesi, dal più vecchio a questo. */
function lastMonths(n: number, now: Date): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export async function GET(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * DAY);
    const since60 = new Date(now.getTime() - 60 * DAY);

    const [tickets, guests, events] = await Promise.all([
      fetchAllRows<TicketRow>(db, (q) =>
        q
          .from('tickets')
          .select('event_id, email, checked_in, created_at, partner_code, consent_marketing')
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: true }),
      ),
      fetchAllRows<GuestRow>(db, (q) =>
        q
          .from('event_guests')
          .select('event_slug, email, checked_in, created_at, partner_code, consent_marketing')
          .order('created_at', { ascending: true }),
      ),
      fetchAllRows<EventRow>(db, (q) =>
        q
          .from('events')
          .select('slug, title, date, price, capacity, published')
          .order('date', { ascending: false }),
      ),
    ]);

    /* ── Le iscrizioni, biglietti e lista insieme ─────────────────── */
    const signups = [
      ...tickets.map((t, i) => ({
        slug: t.event_id,
        person: personKey(t.email, `t${i}`),
        at: t.created_at,
        present: t.checked_in === true,
        partner: t.partner_code,
        marketing: t.consent_marketing === true,
        ticket: true,
      })),
      ...guests.map((g, i) => ({
        slug: g.event_slug,
        person: personKey(g.email, `g${i}`),
        at: g.created_at,
        present: g.checked_in === true,
        partner: g.partner_code,
        marketing: g.consent_marketing === true,
        ticket: false,
      })),
    ].filter((s) => !!s.at);

    /* ── Pubblico: una riga per persona ───────────────────────────── */
    interface Person {
      first: string;
      events: Set<string>;
      marketing: boolean;
      partner: boolean;
    }
    const people = new Map<string, Person>();
    for (const s of signups) {
      const p = people.get(s.person);
      if (!p) {
        people.set(s.person, {
          first: s.at,
          events: new Set(s.slug ? [s.slug] : []),
          marketing: s.marketing,
          partner: !!s.partner,
        });
      } else {
        if (s.at < p.first) p.first = s.at;
        if (s.slug) p.events.add(s.slug);
        p.marketing ||= s.marketing;
        p.partner ||= !!s.partner;
      }
    }

    const months = lastMonths(MONTHS_BACK, now);
    const newByMonthRaw: Record<string, number> = {};
    let new30 = 0;
    let newPrev30 = 0;
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4+': 0 };
    let returning = 0;
    let marketable = 0;
    let viaPartner = 0;

    for (const p of people.values()) {
      const m = monthKey(p.first);
      newByMonthRaw[m] = (newByMonthRaw[m] ?? 0) + 1;
      const firstAt = new Date(p.first);
      if (firstAt >= since30) new30 += 1;
      else if (firstAt >= since60) newPrev30 += 1;

      const n = p.events.size;
      distribution[n >= 4 ? '4+' : String(Math.max(n, 1))] += 1;
      if (n >= 2) returning += 1;
      if (p.marketing) marketable += 1;
      if (p.partner) viaPartner += 1;
    }

    const topPartners = Object.entries(
      signups.reduce<Record<string, number>>((acc, s) => {
        if (s.partner) acc[s.partner] = (acc[s.partner] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    /* ── Eventi: posti occupati, presenti, riempimento ────────────── */
    // Un posto è una persona nella sala: un biglietto vale un posto
    // anche quando due biglietti sono della stessa email, perché chi ne
    // compra due porta qualcuno. Chi era in lista e poi ha comprato,
    // invece, è una persona sola: la riga in lista non conta.
    const ticketedPerEvent = new Map<string, Set<string>>();
    for (const s of signups) {
      if (!s.slug || !s.ticket || s.person.startsWith('#anonimo-')) continue;
      (ticketedPerEvent.get(s.slug) ?? ticketedPerEvent.set(s.slug, new Set()).get(s.slug)!).add(s.person);
    }

    const byEvent = new Map<
      string,
      { seats: number; present: number; people: Set<string>; tickets: number }
    >();
    for (const s of signups) {
      if (!s.slug) continue;
      const e =
        byEvent.get(s.slug) ?? { seats: 0, present: 0, people: new Set<string>(), tickets: 0 };
      e.people.add(s.person);
      const alsoHasTicket = !s.ticket && ticketedPerEvent.get(s.slug)?.has(s.person);
      if (!alsoHasTicket) {
        e.seats += 1;
        if (s.present) e.present += 1;
      }
      if (s.ticket) e.tickets += 1;
      byEvent.set(s.slug, e);
    }

    const eventRows = events
      .filter((e) => byEvent.has(e.slug))
      .map((e) => {
        const d = byEvent.get(e.slug)!;
        return {
          slug: e.slug,
          title: e.title ?? e.slug,
          date: e.date ?? '',
          seats: d.seats,
          people: d.people.size,
          tickets: d.tickets,
          present: d.present,
          capacity: e.capacity && e.capacity > 0 ? e.capacity : null,
          // L'incasso per evento si sa solo dove i biglietti passano da
          // qui. Dove le vendite sono andate altrove si scrive che non
          // si sa, invece di scrivere zero.
          revenue: d.tickets > 0 ? Math.round(d.tickets * (e.price ?? 0)) : null,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const today = now.toISOString().slice(0, 10);
    // Solo gli eventi pubblicati: le bozze in calendario hanno ancora
    // il titolo con il punto interrogativo e zero iscritti.
    const upcoming = events
      .filter((e) => e.published === true && (e.date ?? '') >= today)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0];
    const nextEvent = upcoming
      ? {
          slug: upcoming.slug,
          title: upcoming.title ?? upcoming.slug,
          date: upcoming.date ?? '',
          signups: byEvent.get(upcoming.slug)?.seats ?? 0,
          capacity: upcoming.capacity && upcoming.capacity > 0 ? upcoming.capacity : null,
        }
      : null;

    /* ── Incassi: Stripe è l'unico che li sa tutti ────────────────── */
    // Le sessioni di checkout coprono solo una parte dello storico (le
    // vendite più vecchie sono passate da payment link), quindi il
    // totale si legge dai pagamenti, che ci sono sempre.
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1), 1));
    const revenueByMonthRaw: Record<string, number> = {};
    let revenue30 = 0;
    let revenuePrev30 = 0;
    try {
      for await (const charge of stripe.charges.list({
        limit: 100,
        created: { gte: Math.floor(windowStart.getTime() / 1000) },
      })) {
        if (!charge.paid || charge.refunded) continue;
        const amount = (charge.amount - charge.amount_refunded) / 100;
        if (amount <= 0) continue;
        const at = new Date(charge.created * 1000);
        revenueByMonthRaw[at.toISOString().slice(0, 7)] =
          (revenueByMonthRaw[at.toISOString().slice(0, 7)] ?? 0) + amount;
        if (at >= since30) revenue30 += amount;
        else if (at >= since60) revenuePrev30 += amount;
      }
    } catch (e) {
      console.error('[analytics] Stripe:', e);
    }

    // I mesi prima del primo movimento non dicono niente e su un
    // telefono sono sei righe vuote da scorrere: si tagliano.
    const firstActive = months.findIndex(
      (m) => (revenueByMonthRaw[m] ?? 0) > 0 || (newByMonthRaw[m] ?? 0) > 0,
    );
    const shownMonths = firstActive > 0 ? months.slice(firstActive) : months;

    return NextResponse.json({
      updatedAt: now.toISOString(),
      revenue: {
        last30: Math.round(revenue30),
        prev30: Math.round(revenuePrev30),
        byMonth: shownMonths.map((m) => ({ month: m, label: monthLabel(m), value: Math.round(revenueByMonthRaw[m] ?? 0) })),
      },
      people: {
        total: people.size,
        new30,
        newPrev30,
        newByMonth: shownMonths.map((m) => ({ month: m, label: monthLabel(m), value: newByMonthRaw[m] ?? 0 })),
        returning,
        distribution,
        marketable,
        viaPartner,
        topPartners,
      },
      events: eventRows,
      nextEvent,
    });
  } catch (err) {
    console.error('[analytics]', err);
    return NextResponse.json({ error: 'Impossibile calcolare i numeri.' }, { status: 500 });
  }
}
