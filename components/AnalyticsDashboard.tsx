'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState, PageHead } from '@/components/admin/ui';

/**
 * Analytics.
 *
 * Tre domande, in quest'ordine: quanto entra, come vanno gli eventi,
 * come cresce il pubblico. Ogni numero qui dentro o cambia una
 * decisione o non c'è.
 *
 * Tutti i grafici sono barre orizzontali con l'etichetta scritta
 * accanto: su un telefono una barra verticale alta novanta pixel con
 * la data ruotata sotto non si legge, e questa sezione si guarda quasi
 * sempre dal telefono.
 */

interface Point { month: string; label: string; value: number }

interface EventRow {
  slug: string;
  title: string;
  date: string;
  /** Posti occupati: un biglietto è un posto, chi era in lista e ha comprato conta una volta. */
  seats: number;
  /** Persone distinte, per capire quanti compravano più di un biglietto. */
  people: number;
  tickets: number;
  present: number;
  capacity: number | null;
  revenue: number | null;
}

interface Data {
  updatedAt: string;
  revenue: { last30: number; prev30: number; byMonth: Point[] };
  people: {
    total: number;
    new30: number;
    newPrev30: number;
    newByMonth: Point[];
    returning: number;
    distribution: Record<string, number>;
    marketable: number;
    viaPartner: number;
    topPartners: { code: string; count: number }[];
  };
  events: EventRow[];
  nextEvent: { slug: string; title: string; date: string; signups: number; capacity: number | null } | null;
}

interface Visitors {
  todayVisitors: number;
  last7daysVisitors: number;
  last30daysVisitors: number;
}

const GA_URL   = 'https://analytics.google.com/analytics/web/#/a395406455p538468146';
const META_URL = 'https://business.facebook.com/events_manager2/list/pixel/889556867506381/';

const nf = (n: number) => n.toLocaleString('it-IT');
const eur = (n: number) => `${nf(Math.round(n))} €`;

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC',
  });
}

/* ── Pezzi ──────────────────────────────────────────────────────── */

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule-paper p-5">
      <div className="mb-4">
        <h2 className="ds-display text-[17px] leading-none tracking-[-0.02em]">{title}</h2>
        {note && <p className="mt-2 text-fine text-on-paper-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Il confronto con i trenta giorni prima. Senza un prima con cui
 * confrontarsi non si scrive una percentuale inventata: si tace.
 */
function Delta({ now, before }: { now: number; before: number }) {
  if (before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="text-fine text-on-paper-muted">uguale a prima</span>;
  const up = pct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-fine ${up ? 'text-accent' : 'text-on-paper-muted'}`}>
      <Icon size={13} strokeWidth={2.2} />
      {Math.abs(pct)}% sui 30 giorni prima
    </span>
  );
}

function Kpi({ label, value, foot }: { label: string; value: string; foot?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-rule-paper p-4">
      <p className="text-fine text-on-paper-muted">{label}</p>
      <p className="ds-display mt-2 text-[27px] leading-none tracking-[-0.02em] lg:text-[32px]">{value}</p>
      {foot && <p className="mt-2 text-fine text-on-paper-muted">{foot}</p>}
    </div>
  );
}

/** Una riga: etichetta a sinistra, valore a destra, barra sotto. */
function BarRow({
  label, value, share, tone = 'accent',
}: {
  label: string;
  value: string;
  /** 0–1 rispetto alla riga più grossa dell'elenco. */
  share: number;
  tone?: 'accent' | 'ink';
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-fine text-on-paper-muted">{label}</span>
        <span className="ds-numeric shrink-0 text-body tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-soft">
        <div
          className={`h-full rounded-full ${tone === 'accent' ? 'bg-accent' : 'bg-ink'}`}
          style={{ width: `${share > 0 ? Math.max(share * 100, 1.5) : 0}%` }}
        />
      </div>
    </div>
  );
}

/* ── Pannello ───────────────────────────────────────────────────── */

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [visitors, setVisitors] = useState<Visitors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token ?? ''}` };

      const [main, ga] = await Promise.all([
        fetch('/api/analytics', { headers }),
        fetch('/api/analytics/visitors', { headers }),
      ]);

      const json = await main.json();
      if (!main.ok) throw new Error(json.error ?? 'Impossibile leggere i numeri.');
      setData(json);

      // Google Analytics può non rispondere: il resto della pagina vale comunque.
      setVisitors(ga.ok ? await ga.json() : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const links = (
    <div className="flex flex-wrap items-center gap-2">
      {[{ href: GA_URL, label: 'Google Analytics' }, { href: META_URL, label: 'Meta Pixel' }].map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-rule-paper px-4 text-fine font-medium transition-colors hover:border-accent/40"
        >
          {l.label}
          <ExternalLink size={13} />
        </a>
      ))}
      <button
        onClick={load}
        disabled={loading}
        aria-label="Aggiorna"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rule-paper transition-colors hover:border-accent/40 disabled:opacity-45"
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );

  if (loading && !data) {
    return (
      <>
        <PageHead title="Analytics" action={links} />
        <div className="flex justify-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        <PageHead title="Analytics" action={links} />
        <EmptyState
          title="Non riesco a leggere i numeri"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      </>
    );
  }

  if (!data) return null;

  const { revenue, people, events, nextEvent } = data;

  const maxRevenue = Math.max(...revenue.byMonth.map((m) => m.value), 1);
  const maxNew     = Math.max(...people.newByMonth.map((m) => m.value), 1);
  const maxSeats   = Math.max(...events.map((e) => e.seats), 1);
  const maxPartner = Math.max(...people.topPartners.map((p) => p.count), 1);

  const returningPct = people.total > 0 ? Math.round((people.returning / people.total) * 100) : 0;
  const recent = events.slice(0, 8);

  return (
    <>
      <PageHead
        title="Analytics"
        subtitle="Quanto entra, come vanno gli eventi, come cresce il pubblico."
        action={links}
      />

      {/* ── I quattro numeri che si guardano per primi ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Incassato, 30 giorni"
          value={eur(revenue.last30)}
          foot={<Delta now={revenue.last30} before={revenue.prev30} />}
        />
        <Kpi
          label="Persone nuove, 30 giorni"
          value={nf(people.new30)}
          foot={<Delta now={people.new30} before={people.newPrev30} />}
        />
        <Kpi
          label="Persone in rubrica"
          value={nf(people.total)}
          foot={`${nf(people.marketable)} con consenso mail`}
        />
        <Kpi
          label="Prossimo evento"
          value={nextEvent ? nf(nextEvent.signups) : '—'}
          foot={
            nextEvent
              ? `${nextEvent.title} · ${fmtDate(nextEvent.date)}${nextEvent.capacity ? ` · su ${nf(nextEvent.capacity)} posti` : ''}`
              : 'nessuno in calendario'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Incassi ── */}
        <Block title="Incassi per mese" note="Da Stripe: biglietti, merch e tessere insieme.">
          {revenue.byMonth.every((m) => m.value === 0) ? (
            <p className="py-6 text-center text-fine text-on-paper-muted">Nessun incasso nel periodo.</p>
          ) : (
            <>
              <div className="divide-y divide-rule-paper">
                {revenue.byMonth.map((m) => (
                  <BarRow key={m.month} label={m.label} value={eur(m.value)} share={m.value / maxRevenue} />
                ))}
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-rule-paper pt-3">
                <span className="text-fine text-on-paper-muted">Totale nel periodo</span>
                <span className="ds-numeric text-body font-medium tabular-nums">
                  {eur(revenue.byMonth.reduce((s, m) => s + m.value, 0))}
                </span>
              </div>
            </>
          )}
        </Block>

        {/* ── Pubblico ── */}
        <Block title="Persone nuove per mese" note="Chi compare per la prima volta, in lista o con un biglietto.">
          <div className="divide-y divide-rule-paper">
            {people.newByMonth.map((m) => (
              <BarRow key={m.month} label={m.label} value={nf(m.value)} share={m.value / maxNew} tone="ink" />
            ))}
          </div>
        </Block>
      </div>

      {/* ── Eventi ── */}
      <div className="mt-4">
        <Block
          title="Ultimi eventi"
          note="Un posto è una persona in sala. Chi era in lista e ha poi comprato conta una volta sola."
        >
          {recent.length === 0 ? (
            <p className="py-6 text-center text-fine text-on-paper-muted">Nessun evento con iscritti.</p>
          ) : (
            <div className="flex flex-col divide-y divide-rule-paper">
              {recent.map((e) => {
                const scanned = e.present > 0;
                const showPct = scanned ? Math.round((e.present / Math.max(e.seats, 1)) * 100) : null;
                const fill = e.capacity ? Math.round((e.seats / e.capacity) * 100) : null;
                return (
                  <div key={e.slug} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-body">{e.title}</span>
                      <span className="shrink-0 text-fine text-on-paper-muted">{fmtDate(e.date)}</span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-soft">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max((e.seats / maxSeats) * 100, 1.5)}%` }}
                      />
                    </div>

                    <p className="ds-numeric mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-fine text-on-paper-muted tabular-nums">
                      <span className="text-on-paper">{nf(e.seats)} posti</span>
                      {e.people < e.seats && <span>{nf(e.people)} persone</span>}
                      {fill !== null && <span>{fill}% della capienza</span>}
                      {scanned
                        ? <span>{nf(e.present)} presenti · {showPct}%</span>
                        : <span>presenze non scansionate</span>}
                      {!!e.revenue && <span>{eur(e.revenue)} di biglietti</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Block>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ── Ritorno ── */}
        <Block
          title="Quanti tornano"
          note="Su quante serate diverse è venuta ogni persona."
        >
          <p className="ds-display text-[27px] leading-none tracking-[-0.02em]">{returningPct}%</p>
          <p className="mt-2 text-fine text-on-paper-muted">
            {nf(people.returning)} persone su {nf(people.total)} sono venute a più di un evento.
          </p>
          <div className="mt-4 divide-y divide-rule-paper">
            {(['1', '2', '3', '4+'] as const).map((k) => (
              <BarRow
                key={k}
                label={k === '1' ? 'un evento solo' : k === '4+' ? 'quattro o più' : `${k} eventi`}
                value={nf(people.distribution[k] ?? 0)}
                share={(people.distribution[k] ?? 0) / Math.max(people.total, 1)}
                tone="ink"
              />
            ))}
          </div>
        </Block>

        {/* ── Da dove arrivano ── */}
        <Block title="Da dove arrivano" note="Iscrizioni con un codice promoter, contro chi arriva da solo.">
          <div className="divide-y divide-rule-paper">
            <BarRow
              label="Con un codice promoter"
              value={nf(people.viaPartner)}
              share={people.viaPartner / Math.max(people.total, 1)}
            />
            <BarRow
              label="Dirette"
              value={nf(people.total - people.viaPartner)}
              share={(people.total - people.viaPartner) / Math.max(people.total, 1)}
              tone="ink"
            />
          </div>
          {people.topPartners.length > 0 && (
            <>
              <p className="mt-4 text-fine text-on-paper-muted">Codici più usati</p>
              <div className="mt-1 divide-y divide-rule-paper">
                {people.topPartners.map((p) => (
                  <BarRow key={p.code} label={p.code} value={nf(p.count)} share={p.count / maxPartner} />
                ))}
              </div>
            </>
          )}
        </Block>
      </div>

      {/* ── Sito ── */}
      <div className="mt-4">
        <Block title="Visite al sito" note="Utenti attivi, da Google Analytics.">
          {!visitors ? (
            <p className="text-fine text-on-paper-muted">
              Google Analytics non risponde.{' '}
              <a href={GA_URL} target="_blank" rel="noopener noreferrer" className="underline">
                Aprilo direttamente
              </a>
              .
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'oggi',       value: visitors.todayVisitors },
                { label: '7 giorni',   value: visitors.last7daysVisitors },
                { label: '30 giorni',  value: visitors.last30daysVisitors },
              ].map((v) => (
                <div key={v.label}>
                  <p className="ds-display text-[24px] leading-none tracking-[-0.02em]">{nf(v.value)}</p>
                  <p className="mt-1.5 text-fine text-on-paper-muted">{v.label}</p>
                </div>
              ))}
            </div>
          )}
        </Block>
      </div>
    </>
  );
}
