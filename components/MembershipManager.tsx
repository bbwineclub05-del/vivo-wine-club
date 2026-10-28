'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import { ActionButton, EmptyState, PageHead, Sheet } from '@/components/admin/ui';
import {
  STATUS_LABEL,
  daysLeft,
  priceFor,
  statusOf,
  today,
  type Membership,
  type MembershipStatus,
} from '@/lib/membership';

/**
 * Le tessere.
 *
 * Lo stato non è salvato da nessuna parte: si ricava dalla scadenza,
 * ogni volta. Così non può succedere che qualcuno risulti attivo
 * perché nessuno ha aggiornato un campo.
 *
 * Il filtro che conta è "In scadenza": sono le persone a cui il
 * promemoria sta per partire o è appena partito, ed è l'unica cosa su
 * cui c'è davvero qualcosa da fare.
 */

interface Payment {
  id: string;
  amount_cents: number;
  period_start: string;
  period_end: string;
  status: 'pending' | 'paid' | 'waived' | 'failed';
  paid_at: string | null;
}

type Row = Membership & { payments: Payment[]; welcome_sent_at?: string | null };

const PAYMENT_LABEL: Record<Payment['status'], string> = {
  paid: 'Pagato',
  waived: 'Concesso',
  pending: 'In attesa',
  failed: 'Non riuscito',
};

function eur(cents: number) {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')} €`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${Number(d)} ${mesi[Number(m) - 1]} ${y}`;
}

function StatusPill({ status }: { status: MembershipStatus }) {
  const strong = status === 'expiring' || status === 'expired';
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-fine ${
        strong ? 'border-accent/35 bg-accent/8 text-accent' : 'border-rule-paper text-on-paper-muted'
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Scheda
───────────────────────────────────────────── */
function Detail({
  row,
  onClose,
  onChanged,
}: {
  row: Row | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [mandata, setMandata] = useState(false);
  // Quale delle due mail: attivazione per i soci di prima, benvenuto
  // per chi è arrivato dal modulo pubblico.
  const [tipoMail, setTipoMail] = useState<'attivazione' | 'benvenuto'>('attivazione');
  useOverlayBackClose(!!row, onClose);

  if (!row) return null;

  const now = today();
  const status = statusOf(row, now);
  const left = daysLeft(row, now);
  const price = priceFor(row, now);

  /** Apre il pagamento e copia il collegamento, da mandare alla persona. */
  async function renewLink() {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/memberships/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: row!.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      await navigator.clipboard.writeText(data.url).catch(() => {});
      setMessage('Collegamento al pagamento copiato: mandaglielo pure.');
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusy(false);
    }
  }

  /** Manda il benvenuto a questa persona. Una sola, mai in blocco. */
  async function mandaBenvenuto() {
    setBusy(true);
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/memberships/welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          membershipIds: [row!.id],
          kind: tipoMail,
          force: !!row!.welcome_sent_at,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      const esito = data.esiti?.[0]?.esito ?? 'fatto';
      setMessage(
        esito === 'mandata'
          ? `Mail di ${tipoMail} mandata.`
          : `Non mandata: ${esito}`,
      );
      if (esito === 'mandata') setMandata(true);
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusy(false);
    }
  }

  const benvenutoFatto = mandata || !!row.welcome_sent_at;

  return (
    <Sheet
      open
      title={row.full_name || row.email}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            {(['attivazione', 'benvenuto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTipoMail(t)}
                aria-pressed={tipoMail === t}
                className={`inline-flex min-h-[40px] flex-1 items-center justify-center rounded-full border px-3 text-fine font-medium capitalize transition-colors ${
                  tipoMail === t ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                }`}
              >
                {t === 'attivazione' ? 'Socio di prima' : 'Nuovo iscritto'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ActionButton onClick={renewLink} disabled={busy} className="flex-1">
              {busy ? 'Preparo…' : `Link di rinnovo · ${eur(price.cents)}`}
            </ActionButton>
            <ActionButton variant="quiet" onClick={mandaBenvenuto} disabled={busy}>
              {benvenutoFatto ? 'Rimanda la mail' : 'Manda la mail'}
            </ActionButton>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        {row.member_id && <span className="text-fine text-on-paper-muted">{row.member_id}</span>}
        <span className="text-fine text-on-paper-muted">
          {row.tier === 'founding' ? 'Founding' : 'Standard'}
        </span>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
        {[
          { k: 'Email', v: row.email },
          { k: 'Socio dal', v: fmtDate(row.started_at) },
          { k: 'Scade il', v: fmtDate(row.expires_at) },
          { k: 'Benvenuto', v: row.welcome_sent_at ? `mandato il ${fmtDate(row.welcome_sent_at)}` : 'mai mandato' },
          {
            k: 'Mancano',
            v: left >= 0 ? `${left} ${left === 1 ? 'giorno' : 'giorni'}` : `scaduta da ${-left} giorni`,
          },
          {
            k: 'Rinnovo',
            v: price.discounted
              ? `${eur(price.cents)} se entro il ${fmtDate(price.offerUntil)}, poi ${eur(price.fullCents)}`
              : eur(price.cents),
          },
        ].map((r) => (
          <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-3">
            <dt className="min-w-[110px] shrink-0 text-fine text-on-paper-muted">{r.k}</dt>
            <dd className="min-w-0 break-words text-body">{r.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <p className="mb-2 text-fine font-medium">Anni</p>
        <div className="flex flex-col gap-1.5">
          {row.payments.length === 0 && (
            <p className="text-body text-on-paper-muted">Nessun anno registrato.</p>
          )}
          {row.payments.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rule-paper px-3 py-2.5"
            >
              <span className="text-body">
                {p.period_start.slice(0, 4)}
                {p.period_end.slice(0, 4) !== p.period_start.slice(0, 4) &&
                  `-${p.period_end.slice(0, 4)}`}
              </span>
              <span className="text-fine text-on-paper-muted">
                {PAYMENT_LABEL[p.status]} · {p.amount_cents === 0 ? 'gratuito' : eur(p.amount_cents)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* I promemaria già partiti: utile per sapere se la persona è
          stata avvisata prima di scriverle a mano. */}
      <p className="mt-5 text-fine text-on-paper-muted">
        Promemoria mandati:{' '}
        {[
          row.reminded_30_at && '30 giorni',
          row.reminded_7_at && '7 giorni',
          row.reminded_0_at && 'il giorno stesso',
        ]
          .filter(Boolean)
          .join(', ') || 'nessuno'}
        .
      </p>

      {message && <p className="mt-4 text-fine font-medium text-accent">{message}</p>}
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Membership
───────────────────────────────────────────── */
export default function MembershipManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<MembershipStatus | ''>('');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/memberships', {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere le tessere.');
      setRows(json.memberships ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = today();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) {
      const s = statusOf(r, now);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [rows, now]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter && statusOf(r, now) !== filter) return false;
      if (q && !`${r.full_name ?? ''} ${r.email} ${r.member_id ?? ''}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, filter, query, now]);

  /** Quanto varrebbe il rinnovo di tutti quelli in scadenza. */
  const expiringValue = useMemo(
    () =>
      rows
        .filter((r) => statusOf(r, now) === 'expiring')
        .reduce((sum, r) => sum + priceFor(r, now).cents, 0),
    [rows, now],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="Membership"
        subtitle={`${rows.length} ${rows.length === 1 ? 'tessera' : 'tessere'}. Lo stato si ricava dalla scadenza, non è un campo da aggiornare.`}
      />

      {error ? (
        <EmptyState
          title="Non riesco a leggere le tessere"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          {counts.expiring > 0 && (
            <div className="mb-5 rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3.5">
              <p className="text-fine font-medium text-accent">
                {counts.expiring} {counts.expiring === 1 ? 'tessera scade' : 'tessere scadono'} entro
                trenta giorni
              </p>
              <p className="mt-1 text-fine text-on-paper-muted">
                Valgono {eur(expiringValue)} di rinnovi. Il promemoria parte da solo ogni mattina.
              </p>
            </div>
          )}

          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([['', `Tutte · ${rows.length}`]] as [MembershipStatus | '', string][])
              .concat(
                (['expiring', 'active', 'expired', 'cancelled'] as MembershipStatus[]).map((s) => [
                  s,
                  `${STATUS_LABEL[s]} · ${counts[s] ?? 0}`,
                ]),
              )
              .map(([id, label]) => (
                <button
                  key={id || 'all'}
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                  className={`inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-fine font-medium transition-colors ${
                    filter === id
                      ? 'border-accent bg-accent text-paper'
                      : 'border-rule-paper text-on-paper'
                  }`}
                >
                  {label}
                </button>
              ))}
          </div>

          <div className="mb-5 flex items-center gap-2.5 rounded-full border border-rule-paper px-4">
            <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca nome, email o tessera"
              className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Pulisci"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft"
              >
                <X size={15} strokeWidth={2} />
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="Nessuna tessera"
              body={
                rows.length === 0
                  ? 'Le tessere nascono quando qualcuno si iscrive dal sito.'
                  : 'Prova ad allargare i filtri.'
              }
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              {visible.map((r) => {
                const status = statusOf(r, now);
                const left = daysLeft(r, now);
                return (
                  <button
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-rule-paper px-3.5 py-3 text-left transition-colors hover:border-accent/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-body">
                          {r.full_name || r.email}
                        </span>
                        <StatusPill status={status} />
                      </span>
                      <span className="mt-0.5 block truncate text-fine text-on-paper-muted">
                        {r.member_id ? `${r.member_id} · ` : ''}
                        {status === 'expired'
                          ? `scaduta il ${fmtDate(r.expires_at)}`
                          : `scade il ${fmtDate(r.expires_at)} · fra ${left} ${left === 1 ? 'giorno' : 'giorni'}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <Detail row={detail} onClose={() => setDetail(null)} onChanged={load} />
    </div>
  );
}
