'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState, PageHead } from '@/components/admin/ui';

/**
 * Le richieste arrivate prima del nuovo sistema.
 *
 * Trentanove, di quando le iscrizioni si valutavano una per una.
 * Trentatré risultano approvate, ma approvare allora non creava
 * niente: sono rimaste parole in una colonna.
 *
 * Non le converto in blocco. Alcune sono di mesi fa, e regalare
 * trentatré tessere senza guardarle è una decisione che spetta a chi
 * conosce quelle persone. Qui si vedono una per una, con scritto se
 * hanno già una tessera, e si decide.
 */

interface Row {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  status: string;
  source: string | null;
  created_at: string;
  /** La tessera che questa persona ha già, se ce l'ha. */
  member_id: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  approved: 'Era approvata',
  rejected: 'Era rifiutata',
  pending: 'Mai guardata',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MembershipArchive() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [query, setQuery] = useState('');
  const [onlyWithout, setOnlyWithout] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const res = await fetch('/api/memberships/archive', {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere l’archivio.');
      setRows(json.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCard(row: Row) {
    setBusyId(row.id);
    setMessage('');
    try {
      const res = await fetch('/api/memberships/from-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId: row.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      setMessage(`Tessera ${data.membership.member_id} creata per ${row.name}.`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusyId(null);
    }
  }

  const senzaTessera = useMemo(() => rows.filter((r) => !r.member_id).length, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyWithout && r.member_id) return false;
      if (q && !`${r.name} ${r.email} ${r.city ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, onlyWithout]);

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
        title="Richieste storiche"
        subtitle={`${rows.length} richieste ricevute prima che la tessera si comprasse. ${senzaTessera} non hanno ancora una tessera.`}
      />

      {message && (
        <p className="mb-5 rounded-2xl border border-rule-paper px-4 py-3 text-fine font-medium">
          {message}
        </p>
      )}

      {error ? (
        <EmptyState
          title="Non riesco a leggere l'archivio"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-full border border-rule-paper px-4">
              <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca nome, email o città"
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
            <button
              onClick={() => setOnlyWithout((v) => !v)}
              aria-pressed={onlyWithout}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border px-4 text-fine font-medium transition-colors ${
                onlyWithout
                  ? 'border-accent bg-accent text-paper'
                  : 'border-rule-paper text-on-paper'
              }`}
            >
              Solo senza tessera
            </button>
          </div>

          {visible.length === 0 ? (
            <EmptyState title="Niente qui" body="Prova ad allargare i filtri." />
          ) : (
            <div className="flex flex-col gap-1.5">
              {visible.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule-paper px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body">{r.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 truncate text-fine text-on-paper-muted">
                      <span>{r.email}</span>
                      {r.city && <span>{r.city}</span>}
                      <span>{fmtDate(r.created_at)}</span>
                      <span>{STATUS_LABEL[r.status] ?? r.status}</span>
                    </p>
                  </div>

                  {r.member_id ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/35 bg-accent/8 px-3 py-1 text-fine text-accent">
                      <Check size={14} strokeWidth={2.5} />
                      {r.member_id}
                    </span>
                  ) : (
                    <ActionButton
                      variant="quiet"
                      onClick={() => createCard(r)}
                      disabled={busyId === r.id}
                    >
                      {busyId === r.id ? 'Creo…' : 'Crea tessera'}
                    </ActionButton>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
