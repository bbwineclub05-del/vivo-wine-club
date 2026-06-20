'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Download,
  TrendingUp, TrendingDown, Wallet, BarChart3, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type TxType  = 'revenue' | 'cost' | 'rimborso';
type Category = 'Evento' | 'Membership' | 'Sponsorship' | 'Merchandise' | 'Affitto' | 'Marketing' | 'Altro';
type PeriodType = 'monthly' | 'quarterly' | 'annual';

interface BudgetCategory {
  id:   string;
  name: string;
  type: 'revenue' | 'cost' | 'both';
}

interface Transaction {
  id:              string;
  date:            string;
  category:        Category;
  type:            TxType;
  amount:          number;
  budget_category: string | null;
}

interface CategoryRow { entrate: number; uscite: number; saldo: number }

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function isCostLike(type: TxType) { return type === 'cost' || type === 'rimborso'; }

function getPeriodRange(
  periodType: PeriodType,
  year: number,
  month: number,
  quarter: number,
): { from: string; to: string; label: string } {
  if (periodType === 'monthly') {
    const from    = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to      = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to, label: `${MONTHS_IT[month]} ${year}` };
  }
  if (periodType === 'quarterly') {
    const startMonth = quarter * 3;
    const endMonth   = startMonth + 2;
    const from       = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
    const lastDay    = new Date(year, endMonth + 1, 0).getDate();
    const to         = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to, label: `Q${quarter + 1} ${year}` };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Anno ${year}` };
}

/* ─────────────────────────────────────────────
   Summary card sub-component
───────────────────────────────────────────── */
function SummaryCard({
  label, value, icon: Icon, variant, signed = false,
}: {
  label:   string;
  value:   number;
  icon:    React.ElementType;
  variant: 'green' | 'red' | 'bordeaux' | 'dark';
  signed?: boolean;
}) {
  const config = {
    green:    { wrap: 'bg-emerald-50 border-emerald-200/60',          ico: 'text-emerald-500', val: 'text-emerald-700', lbl: 'text-emerald-600/70' },
    red:      { wrap: 'bg-red-50 border-red-200/50',                  ico: 'text-red-500',     val: 'text-red-600',     lbl: 'text-red-500/70'     },
    bordeaux: { wrap: 'bg-[#fdf0f0] border-[#eddada]',                ico: 'text-[#731515]',   val: value >= 0 ? 'text-[#731515]' : 'text-red-600', lbl: 'text-[#7a4a4a]/55' },
    dark:     { wrap: 'bg-[#0d0202] border-white/[0.08]',             ico: 'text-white/45',    val: value >= 0 ? 'text-emerald-400' : 'text-red-400', lbl: 'text-white/30'      },
  }[variant];

  const display = (signed && value >= 0 ? '+' : '') + fmtEur(value);

  return (
    <div className={`border rounded-xl p-5 ${config.wrap}`}>
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[9px] tracking-[0.35em] uppercase font-medium ${config.lbl}`} style={{ fontFamily: 'var(--font-nunito)' }}>
          {label}
        </span>
        <Icon size={14} className={config.ico} />
      </div>
      <div className={`text-[clamp(0.95rem,1.8vw,1.2rem)] font-semibold leading-tight ${config.val}`} style={{ fontFamily: 'var(--font-nunito)' }}>
        {display}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function BilancioManager() {
  const now = new Date();

  const [allTx,           setAllTx]           = useState<Transaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [exporting,        setExporting]        = useState(false);
  const [token,            setToken]            = useState('');

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth());
  const [quarter,    setQuarter]    = useState(Math.floor(now.getMonth() / 3));

  // Fetch session token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
  }, []);

  // Fetch all transactions and budget categories once
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      // Fetch transactions — use select('*') so the query never fails due to a
      // missing optional column (e.g. budget_category before the migration runs).
      // Use a high range limit to prevent Supabase's default 1 000-row pagination
      // from silently dropping data when switching to annual view.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txRes = await (supabase as any)
        .from('transactions')
        .select('*')
        .order('date', { ascending: true })
        .range(0, 9999);

      if (txRes.error) {
        console.error('[BilancioManager] transactions fetch error:', txRes.error.message);
      } else {
        console.log('[BilancioManager] transactions fetched:', txRes.data?.length ?? 0, 'rows', txRes.data?.[0] ?? '(empty)');
        setAllTx(txRes.data ?? []);
      }

      // Fetch budget categories — table may not exist yet; fail gracefully.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catRes = await (supabase as any)
        .from('budget_categories')
        .select('id, name, type')
        .order('name', { ascending: true });

      if (catRes.error) {
        console.warn('[BilancioManager] budget_categories not available yet:', catRes.error.message);
      } else {
        setBudgetCategories(catRes.data ?? []);
      }

      setLoading(false);
    }
    fetchAll();
  }, []);

  // Period range
  const { from, to, label } = useMemo(
    () => getPeriodRange(periodType, year, month, quarter),
    [periodType, year, month, quarter],
  );

  // Transactions in the selected period.
  // Slice to 10 chars (YYYY-MM-DD) so that Supabase timestamps like
  // '2026-12-31T00:00:00+00:00' compare correctly against bare date strings.
  const periodTx = useMemo(
    () => allTx.filter(tx => {
      const d = tx.date.slice(0, 10);
      return d >= from && d <= to;
    }),
    [allTx, from, to],
  );

  // Debug: log whenever the filtered set changes
  useMemo(() => {
    console.log('[BilancioManager] period:', from, '→', to, '| periodTx:', periodTx.length,
      '| entrate:', periodTx.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0).toFixed(2),
      '| uscite:',  periodTx.filter(t => isCostLike(t.type)).reduce((s, t) => s + t.amount, 0).toFixed(2),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodTx]);

  // Summary values
  const entrate = useMemo(
    () => periodTx.filter(tx => tx.type === 'revenue').reduce((s, tx) => s + tx.amount, 0),
    [periodTx],
  );
  const uscite = useMemo(
    () => periodTx.filter(tx => isCostLike(tx.type)).reduce((s, tx) => s + tx.amount, 0),
    [periodTx],
  );
  const saldoPeriodo    = entrate - uscite;
  const saldoCumulativo = useMemo(
    () => allTx
      .filter(tx => tx.date.slice(0, 10) <= to)
      .reduce((s, tx) => s + (tx.type === 'revenue' ? tx.amount : -tx.amount), 0),
    [allTx, to],
  );

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, CategoryRow> = {};
    for (const tx of periodTx) {
      const key = tx.budget_category ?? tx.category ?? 'Altro';
      if (!map[key]) map[key] = { entrate: 0, uscite: 0, saldo: 0 };
      if (tx.type === 'revenue') map[key].entrate += tx.amount;
      else map[key].uscite += tx.amount;
    }
    for (const key of Object.keys(map)) {
      map[key].saldo = map[key].entrate - map[key].uscite;
    }
    return map;
  }, [periodTx]);

  const activeCategories = Object.keys(categoryBreakdown).filter(cat =>
    categoryBreakdown[cat].entrate > 0 || categoryBreakdown[cat].uscite > 0
  ).sort();

  /* ── Navigation ── */
  function prevPeriod() {
    if (periodType === 'monthly') {
      if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    } else if (periodType === 'quarterly') {
      if (quarter === 0) { setQuarter(3); setYear(y => y - 1); } else setQuarter(q => q - 1);
    } else {
      setYear(y => y - 1);
    }
  }

  function nextPeriod() {
    if (periodType === 'monthly') {
      if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    } else if (periodType === 'quarterly') {
      if (quarter === 3) { setQuarter(0); setYear(y => y + 1); } else setQuarter(q => q + 1);
    } else {
      setYear(y => y + 1);
    }
  }

  function changePeriodType(pt: PeriodType) {
    const n = new Date();
    setPeriodType(pt);
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setQuarter(Math.floor(n.getMonth() / 3));
  }

  /* ── PDF export ── */
  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      const revenueCategories = Object.entries(categoryBreakdown)
        .filter(([, row]) => row.entrate > 0 && row.uscite === 0)
        .map(([name, row]) => ({ name, amount: row.entrate }));
      const costCategories = Object.entries(categoryBreakdown)
        .filter(([, row]) => row.uscite > 0 && row.entrate === 0)
        .map(([name, row]) => ({ name, amount: row.uscite }));
      const mixedCategories = Object.entries(categoryBreakdown)
        .filter(([, row]) => row.entrate > 0 && row.uscite > 0)
        .map(([name, row]) => ({ name, entrate: row.entrate, uscite: row.uscite, saldo: row.saldo }));

      const res = await fetch('/api/bilancio/pdf', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          periodLabel: label, from, to,
          entrate, uscite, saldoPeriodo, saldoCumulativo,
          categoryBreakdown,
          revenueCategories,
          costCategories,
          mixedCategories,
        }),
      });
      if (!res.ok) { console.error('[bilancio] PDF error', await res.text()); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `bilancio-${label.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  /* ── Render ── */
  return (
    <div>
      {/* ── Controls bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">

        {/* Period type toggle */}
        <div className="flex items-center gap-1 bg-[#fdf6f6] border border-[#eddada] rounded-lg p-1 shrink-0">
          {(['monthly', 'quarterly', 'annual'] as PeriodType[]).map(pt => (
            <button
              key={pt}
              onClick={() => changePeriodType(pt)}
              className={`px-4 py-1.5 rounded-lg text-[10.5px] tracking-[0.12em] uppercase transition-all duration-150 ${
                periodType === pt
                  ? 'bg-[#731515] text-white shadow-sm'
                  : 'text-[#7a4a4a]/55 hover:text-[#731515]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {pt === 'monthly' ? 'Mensile' : pt === 'quarterly' ? 'Trimestrale' : 'Annuale'}
            </button>
          ))}
        </div>

        {/* Period navigation */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={prevPeriod}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eddada] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span
            className="text-sm font-medium text-[#1a0505] min-w-[160px] text-center select-none"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {label}
          </span>
          <button
            onClick={nextPeriod}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eddada] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-[#731515] text-white text-[10px] tracking-[0.25em] uppercase rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Esporta PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={22} className="animate-spin text-[#731515]/30" />
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Entrate"          value={entrate}         icon={TrendingUp}  variant="green"    />
            <SummaryCard label="Uscite"           value={uscite}          icon={TrendingDown} variant="red"     />
            <SummaryCard label="Saldo Periodo"    value={saldoPeriodo}    icon={BarChart3}   variant="bordeaux" signed />
            <SummaryCard label="Saldo Cumulativo" value={saldoCumulativo} icon={Wallet}      variant="dark"     signed />
          </div>

          {/* ── Category breakdown table ── */}
          {activeCategories.length === 0 ? (
            <div
              className="text-center py-16 text-[#7a4a4a]/40 text-sm"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Nessuna transazione nel periodo selezionato.
            </div>
          ) : (
            <>
              <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.06)]">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#fdf6f6] border-b border-[#eddada]">
                      <th className="text-left px-5 py-3 text-[9px] tracking-[0.4em] text-[#731515] uppercase font-semibold" style={{ fontFamily: 'var(--font-nunito)' }}>Categoria</th>
                      <th className="text-right px-5 py-3 text-[9px] tracking-[0.4em] text-[#731515] uppercase font-semibold" style={{ fontFamily: 'var(--font-nunito)' }}>Entrate</th>
                      <th className="text-right px-5 py-3 text-[9px] tracking-[0.4em] text-[#731515] uppercase font-semibold" style={{ fontFamily: 'var(--font-nunito)' }}>Uscite</th>
                      <th className="text-right px-5 py-3 text-[9px] tracking-[0.4em] text-[#731515] uppercase font-semibold" style={{ fontFamily: 'var(--font-nunito)' }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCategories.map((cat, i) => {
                      const row = categoryBreakdown[cat];
                      return (
                        <tr key={cat} className={`border-b border-[#eddada]/50 ${i % 2 === 1 ? 'bg-[#fdf6f6]/40' : ''}`}>
                          <td className="px-5 py-3 text-[13px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>{cat}</td>
                          <td className="px-5 py-3 text-right text-[13px] text-emerald-700 tabular-nums" style={{ fontFamily: 'var(--font-nunito)' }}>
                            {row.entrate > 0 ? fmtEur(row.entrate) : <span className="text-[#7a4a4a]/30">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-[13px] text-red-600 tabular-nums" style={{ fontFamily: 'var(--font-nunito)' }}>
                            {row.uscite > 0 ? fmtEur(row.uscite) : <span className="text-[#7a4a4a]/30">—</span>}
                          </td>
                          <td className={`px-5 py-3 text-right text-[13px] font-semibold tabular-nums ${row.saldo >= 0 ? 'text-emerald-700' : 'text-red-600'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                            {row.saldo >= 0 ? '+' : ''}{fmtEur(row.saldo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#fdf0f0] border-t-2 border-[#eddada]">
                      <td className="px-5 py-3 text-[10.5px] tracking-[0.25em] uppercase font-bold text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>Totale</td>
                      <td className="px-5 py-3 text-right text-[13px] font-bold text-emerald-700 tabular-nums" style={{ fontFamily: 'var(--font-nunito)' }}>{fmtEur(entrate)}</td>
                      <td className="px-5 py-3 text-right text-[13px] font-bold text-red-600 tabular-nums" style={{ fontFamily: 'var(--font-nunito)' }}>{fmtEur(uscite)}</td>
                      <td className={`px-5 py-3 text-right text-[13px] font-bold tabular-nums ${saldoPeriodo >= 0 ? 'text-emerald-700' : 'text-red-600'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                        {saldoPeriodo >= 0 ? '+' : ''}{fmtEur(saldoPeriodo)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="mt-3 text-[10px] text-[#7a4a4a]/35" style={{ fontFamily: 'var(--font-nunito)' }}>
                {periodTx.length} transazion{periodTx.length === 1 ? 'e' : 'i'} nel periodo
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
