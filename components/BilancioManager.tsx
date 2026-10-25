'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { scaricaDalServer } from '@/lib/scarica';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState, PageHead } from '@/components/admin/ui';
import { formatEur, toCents, type EntryType } from '@/lib/ledger';

/**
 * Bilancio.
 *
 * Risponde a due domande, e a nessun'altra: quanto è entrato e quanto
 * è uscito in un periodo, e da dove. La tabella di prima ne prometteva
 * quattro — entrate, uscite e saldo per ogni categoria, tutto insieme —
 * in una griglia larga cinquecentoventi pixel che su un telefono si
 * leggeva scorrendo di lato.
 *
 * Qui le due domande stanno in due elenchi separati, ordinati dalla
 * voce più grossa alla più piccola, con una barra che fa vedere il peso
 * senza doverlo calcolare. Una categoria che ha sia entrate sia uscite
 * compare in entrambi, con la sua cifra: è più onesto che mostrarne il
 * saldo netto, che nasconde quanto è girato.
 *
 * I conti sono quelli di `lib/ledger`: rimborsi e versamenti non
 * compaiono, perché spostano soldi fra la cassa e le tasche di
 * qualcuno senza crearne né distruggerne.
 */

type PeriodType = 'monthly' | 'quarterly' | 'annual';

interface Row {
  id: string;
  date: string;
  amount: number;
  entry_type: EntryType | null;
  budget_category: string | null;
  category: string | null;
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function periodRange(kind: PeriodType, year: number, month: number, quarter: number) {
  if (kind === 'monthly') {
    const mm = String(month + 1).padStart(2, '0');
    const last = new Date(year, month + 1, 0).getDate();
    return {
      from: `${year}-${mm}-01`,
      to: `${year}-${mm}-${String(last).padStart(2, '0')}`,
      label: `${MONTHS[month]} ${year}`,
    };
  }
  if (kind === 'quarterly') {
    const start = quarter * 3;
    const end = start + 2;
    const last = new Date(year, end + 1, 0).getDate();
    return {
      from: `${year}-${String(start + 1).padStart(2, '0')}-01`,
      to: `${year}-${String(end + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
      label: `${MONTHS[start].slice(0, 3)}–${MONTHS[end].slice(0, 3)} ${year}`,
    };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Anno ${year}` };
}

/* ─────────────────────────────────────────────
   Una voce dell'elenco
───────────────────────────────────────────── */
function CategoryRow({
  name,
  cents,
  share,
  tone,
}: {
  name: string;
  cents: number;
  /** 0–1, quanto pesa rispetto alla voce più grossa dell'elenco. */
  share: number;
  tone: 'income' | 'expense';
}) {
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 truncate text-body">{name}</span>
        <span className="ds-numeric shrink-0 text-body tabular-nums">{formatEur(cents)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-soft">
        <div
          className={`h-full rounded-full ${tone === 'expense' ? 'bg-accent' : 'bg-ink'}`}
          style={{ width: `${Math.max(share * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Bilancio
───────────────────────────────────────────── */
export default function BilancioManager() {
  const now = useMemo(() => new Date(), []);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [exporting, setExporting] = useState(false);
  /** Cosa e' successo all'ultimo scarico: prima non lo sapeva nessuno. */
  const [esitoPdf, setEsitoPdf] = useState('');

  const [kind, setKind] = useState<PeriodType>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3));

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const res = await fetch('/api/finance/entries', { headers: { Authorization: `Bearer ${tk}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere il registro.');
      setRows(json.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { from, to, label } = useMemo(
    () => periodRange(kind, year, month, quarter),
    [kind, year, month, quarter],
  );

  function step(dir: -1 | 1) {
    if (kind === 'monthly') {
      const next = month + dir;
      if (next < 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else if (next > 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else setMonth(next);
      return;
    }
    if (kind === 'quarterly') {
      const next = quarter + dir;
      if (next < 0) {
        setQuarter(3);
        setYear((y) => y - 1);
      } else if (next > 3) {
        setQuarter(0);
        setYear((y) => y + 1);
      } else setQuarter(next);
      return;
    }
    setYear((y) => y + dir);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setQuarter(Math.floor(now.getMonth() / 3));
  }

  /* ── I conti del periodo, in centesimi ── */
  const stats = useMemo(() => {
    const inPeriod = rows.filter((r) => {
      const d = r.date.slice(0, 10);
      return d >= from && d <= to;
    });

    let entrate = 0;
    let uscite = 0;
    const income: Record<string, number> = {};
    const expense: Record<string, number> = {};

    for (const r of inPeriod) {
      // I trasferimenti non sono né entrate né uscite.
      if (r.entry_type !== 'income' && r.entry_type !== 'expense') continue;
      const cents = toCents(r.amount) ?? 0;
      const key = r.budget_category || r.category || 'Senza categoria';
      if (r.entry_type === 'income') {
        entrate += cents;
        income[key] = (income[key] ?? 0) + cents;
      } else {
        uscite += cents;
        expense[key] = (expense[key] ?? 0) + cents;
      }
    }

    // Il cumulato va dall'inizio di sempre fino alla fine del periodo.
    let cumulato = 0;
    for (const r of rows) {
      if (r.date.slice(0, 10) > to) continue;
      if (r.entry_type === 'income') cumulato += toCents(r.amount) ?? 0;
      else if (r.entry_type === 'expense') cumulato -= toCents(r.amount) ?? 0;
    }

    const sort = (m: Record<string, number>) =>
      Object.entries(m).sort((a, b) => b[1] - a[1]);

    return {
      count: inPeriod.filter((r) => r.entry_type === 'income' || r.entry_type === 'expense').length,
      transfers: inPeriod.length - inPeriod.filter((r) => r.entry_type === 'income' || r.entry_type === 'expense').length,
      entrate,
      uscite,
      risultato: entrate - uscite,
      cumulato,
      income: sort(income),
      expense: sort(expense),
    };
  }, [rows, from, to]);

  /* ── PDF: stessa struttura di prima, in euro ── */
  async function exportPdf() {
    setExporting(true);
    try {
      const breakdown: Record<string, { entrate: number; uscite: number; saldo: number }> = {};
      for (const [name, c] of stats.income) {
        breakdown[name] = { entrate: c / 100, uscite: 0, saldo: c / 100 };
      }
      for (const [name, c] of stats.expense) {
        const cur = breakdown[name] ?? { entrate: 0, uscite: 0, saldo: 0 };
        cur.uscite = c / 100;
        cur.saldo = cur.entrate - cur.uscite;
        breakdown[name] = cur;
      }

      const esito = await scaricaDalServer(
        '/api/bilancio/pdf',
        `bilancio-${label.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        {
          token,
          body: {
            periodLabel: label,
            from,
            to,
            entrate: stats.entrate / 100,
            uscite: stats.uscite / 100,
            saldoPeriodo: stats.risultato / 100,
            saldoCumulativo: stats.cumulato / 100,
            categoryBreakdown: breakdown,
            revenueCategories: Object.entries(breakdown)
              .filter(([, r]) => r.entrate > 0 && r.uscite === 0)
              .map(([name, r]) => ({ name, amount: r.entrate })),
            costCategories: Object.entries(breakdown)
              .filter(([, r]) => r.uscite > 0 && r.entrate === 0)
              .map(([name, r]) => ({ name, amount: r.uscite })),
            mixedCategories: Object.entries(breakdown)
              .filter(([, r]) => r.entrate > 0 && r.uscite > 0)
              .map(([name, r]) => ({ name, entrate: r.entrate, uscite: r.uscite, saldo: r.saldo })),
          },
        },
      );
      setEsitoPdf(esito.messaggio ?? '');
    } finally {
      setExporting(false);
    }
  }

  const maxIncome = stats.income[0]?.[1] ?? 1;
  const maxExpense = stats.expense[0]?.[1] ?? 1;
  const empty = stats.income.length === 0 && stats.expense.length === 0;

  return (
    <div>
      <PageHead
        title="Bilancio"
        subtitle="Quanto è entrato e quanto è uscito, e da dove."
        action={
          <ActionButton onClick={exportPdf} disabled={exporting || loading}>
            <Download size={17} strokeWidth={1.9} />
            {exporting ? 'Preparo…' : 'Esporta PDF'}
          </ActionButton>
        }
      />

      {esitoPdf && (
        <p className="mb-4 rounded-2xl border border-rule-paper px-4 py-3 text-fine text-on-paper-muted">
          {esitoPdf}
        </p>
      )}

      {/* Periodo */}
      <div className="mb-3 flex rounded-full border border-rule-paper p-1 lg:w-fit">
        {(
          [
            { id: 'monthly', label: 'Mese' },
            { id: 'quarterly', label: 'Trimestre' },
            { id: 'annual', label: 'Anno' },
          ] as { id: PeriodType; label: string }[]
        ).map((p) => (
          <button
            key={p.id}
            onClick={() => setKind(p.id)}
            aria-pressed={kind === p.id}
            className={`min-h-[44px] flex-1 rounded-full px-3 text-fine font-medium transition-colors lg:flex-none lg:px-7 ${
              kind === p.id ? 'bg-accent text-paper' : 'text-on-paper-muted'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-2">
        <h2 className="ds-display mr-auto truncate text-[19px] leading-none tracking-[-0.02em] lg:text-[24px]">
          {label}
        </h2>
        <button
          onClick={() => step(-1)}
          aria-label="Periodo precedente"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rule-paper transition-colors hover:border-accent/40"
        >
          <ChevronLeft size={19} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => step(1)}
          aria-label="Periodo successivo"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rule-paper transition-colors hover:border-accent/40"
        >
          <ChevronRight size={19} strokeWidth={1.8} />
        </button>
        <button
          onClick={goToday}
          className="min-h-[40px] shrink-0 rounded-full border border-rule-paper px-3.5 text-fine font-medium transition-colors hover:border-accent/40"
        >
          Oggi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : error ? (
        <EmptyState
          title="Non riesco a leggere il registro"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          {/* I numeri */}
          <div className="mb-8 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { k: 'Entrate', v: formatEur(stats.entrate) },
              { k: 'Uscite', v: formatEur(stats.uscite) },
              { k: 'Risultato del periodo', v: formatEur(stats.risultato, true), strong: true },
              { k: 'Risultato cumulato', v: formatEur(stats.cumulato, true) },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl border border-rule-paper p-4">
                <p className="text-fine text-on-paper-muted">{c.k}</p>
                <p
                  className={`ds-display mt-1.5 text-[22px] leading-none tracking-[-0.02em] lg:text-[24px] ${
                    c.strong && stats.risultato < 0 ? 'text-accent' : ''
                  }`}
                >
                  {c.v}
                </p>
              </div>
            ))}
          </div>

          {empty ? (
            <EmptyState
              title="Nessun movimento in questo periodo"
              body="Prova con un altro mese, o passa alla vista annuale."
            />
          ) : (
            <div className="flex flex-col gap-9">
              <section>
                <h3 className="mb-1 flex items-baseline justify-between gap-4 text-subtitle font-medium">
                  Da dove sono entrati
                  <span className="ds-numeric text-body tabular-nums">
                    {formatEur(stats.entrate)}
                  </span>
                </h3>
                {stats.income.length === 0 ? (
                  <p className="py-5 text-body text-on-paper-muted">
                    Nessuna entrata in questo periodo.
                  </p>
                ) : (
                  <div className="divide-y divide-rule-paper border-t border-rule-paper">
                    {stats.income.map(([name, cents]) => (
                      <CategoryRow
                        key={name}
                        name={name}
                        cents={cents}
                        share={cents / maxIncome}
                        tone="income"
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-1 flex items-baseline justify-between gap-4 text-subtitle font-medium">
                  Dove sono usciti
                  <span className="ds-numeric text-body tabular-nums">
                    {formatEur(stats.uscite)}
                  </span>
                </h3>
                {stats.expense.length === 0 ? (
                  <p className="py-5 text-body text-on-paper-muted">
                    Nessuna uscita in questo periodo.
                  </p>
                ) : (
                  <div className="divide-y divide-rule-paper border-t border-rule-paper">
                    {stats.expense.map(([name, cents]) => (
                      <CategoryRow
                        key={name}
                        name={name}
                        cents={cents}
                        share={cents / maxExpense}
                        tone="expense"
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          <p className="mt-8 text-fine text-on-paper-muted">
            {stats.count} {stats.count === 1 ? 'movimento' : 'movimenti'} nel periodo.
            {stats.transfers > 0 && (
              <>
                {' '}
                Esclusi {stats.transfers}{' '}
                {stats.transfers === 1 ? 'fra rimborsi e versamenti' : 'fra rimborsi e versamenti'}:
                spostano soldi fra la cassa e le tasche di qualcuno, non sono entrate né uscite.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
