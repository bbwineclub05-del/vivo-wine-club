'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, TrendingUp, TrendingDown, Wallet,
  ChevronLeft, ChevronRight, Pencil, Trash2, RefreshCw,
  Paperclip, ExternalLink, Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type TxType = 'revenue' | 'cost' | 'rimborso';

type Category =
  | 'Evento' | 'Membership' | 'Sponsorship'
  | 'Merchandise' | 'Affitto' | 'Marketing' | 'Altro';

interface Transaction {
  id:             string;
  date:           string; // "YYYY-MM-DD" from Supabase
  description:    string;
  category:       Category;
  type:           TxType;
  amount:         number;
  notes:          string | null;
  receipt_url:    string | null;
  reimbursed_to:  string | null;
  created_by:     string | null;
  created_at:     string;
}

type FormData = Omit<Transaction, 'id' | 'created_by' | 'created_at'>;

const CATEGORIES: Category[] = [
  'Evento', 'Membership', 'Sponsorship', 'Merchandise', 'Affitto', 'Marketing', 'Altro',
];

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];
const MONTHS_SHORT = [
  'Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic',
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(iso: string) {
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Month key used for both the map and the pill buttons: "YYYY-MM" */
function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** True if a transaction belongs to the given year/month (0-indexed month) */
function txInMonth(tx: Transaction, year: number, month: number) {
  return tx.date.startsWith(monthKey(year, month));
}

/** Rimborso and cost both subtract from saldo */
function isCostLike(type: TxType) {
  return type === 'cost' || type === 'rimborso';
}

function generateMonths(count: number): { year: number; month: number }[] {
  const result = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}

const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-sm ' +
  'placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

/* ─────────────────────────────────────────────
   Type button config
───────────────────────────────────────────── */
const TYPE_CONFIG: Record<TxType, { label: string; prefix: string; activeCls: string; textCls: string; bgRow: string; hoverRow: string; badgeCls: string }> = {
  revenue:  {
    label:     '▲ REVENUE',
    prefix:    '+',
    activeCls: 'bg-emerald-500 text-white border-emerald-500',
    textCls:   'text-emerald-700',
    bgRow:     'bg-emerald-50/40',
    hoverRow:  'hover:bg-emerald-50',
    badgeCls:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cost:     {
    label:     '▼ COSTO',
    prefix:    '−',
    activeCls: 'bg-[#731515] text-white border-[#731515]',
    textCls:   'text-red-600',
    bgRow:     'bg-red-50/30',
    hoverRow:  'hover:bg-red-50',
    badgeCls:  'bg-red-50 text-red-600 border-red-200',
  },
  rimborso: {
    label:     '↩ RIMBORSO',
    prefix:    '−',
    activeCls: 'bg-orange-500 text-white border-orange-500',
    textCls:   'text-orange-600',
    bgRow:     'bg-orange-50/40',
    hoverRow:  'hover:bg-orange-50',
    badgeCls:  'bg-orange-50 text-orange-600 border-orange-200',
  },
};

/* ─────────────────────────────────────────────
   Add / Edit Modal
───────────────────────────────────────────── */
const EMPTY_FORM: FormData = {
  date:           localToday(),
  description:    '',
  category:       'Evento',
  type:           'revenue',
  amount:         0,
  notes:          null,
  receipt_url:    null,
  reimbursed_to:  null,
};

function TxModal({
  initial,
  onSave,
  onClose,
}: {
  initial:  FormData | null;
  onSave:   (data: FormData) => Promise<void>;
  onClose:  () => void;
}) {
  const [form,        setForm]        = useState<FormData>(initial ?? { ...EMPTY_FORM, date: localToday() });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [uploadPct,   setUploadPct]   = useState<number | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!form.description.trim())  { setError('La descrizione è obbligatoria.'); return; }
    if (!form.amount || form.amount <= 0) { setError('Inserisci un importo valido.'); return; }
    setSaving(true); setError(null);
    try {
      let receipt_url = form.receipt_url;

      // Upload file if selected
      if (fileToUpload) {
        setUploadPct(0);
        const ext  = fileToUpload.name.split('.').pop() ?? 'bin';
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('receipts')
          .upload(path, fileToUpload, { upsert: false });
        if (uploadErr) throw new Error(`Upload ricevuta: ${uploadErr.message}`);
        setUploadPct(100);
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }

      await onSave({
        ...form,
        description:   form.description.trim(),
        notes:         form.notes?.trim()         || null,
        reimbursed_to: form.reimbursed_to?.trim() || null,
        receipt_url,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
      setUploadPct(null);
    }
  }

  const isNew = initial === null;
  const cfg   = TYPE_CONFIG[form.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eddada] sticky top-0 bg-white z-10">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">
              {isNew ? 'NUOVA TRANSAZIONE' : 'MODIFICA TRANSAZIONE'}
            </div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {isNew ? 'Aggiungi movimento' : form.description}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tipo — 3 buttons */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-2">TIPO</div>
            <div className="grid grid-cols-3 gap-2">
              {(['revenue', 'cost', 'rimborso'] as TxType[]).map(t => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`py-2.5 rounded-lg text-[10px] tracking-[0.15em] font-medium transition-all border ${
                    form.type === t
                      ? TYPE_CONFIG[t].activeCls
                      : 'bg-white text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/30'
                  }`}
                >
                  {TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Data + Importo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DATA</div>
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={e => set('date', e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">IMPORTO (€)</div>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                placeholder="0,00"
                value={form.amount || ''}
                onChange={e => set('amount', parseFloat(e.target.value) || 0)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DESCRIZIONE</div>
            <input
              className={inputCls}
              placeholder="Es. Biglietti evento Wine Party..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

          {/* Categoria */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">CATEGORIA</div>
            <select
              className={inputCls}
              value={form.category}
              onChange={e => set('category', e.target.value as Category)}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Rimborsato a (solo rimborso) */}
          <AnimatePresence>
            {form.type === 'rimborso' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{    opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="text-[9px] tracking-[0.35em] text-orange-500 mb-1.5">RIMBORSATO A <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
                <input
                  className={inputCls}
                  placeholder="Nome della persona..."
                  value={form.reimbursed_to ?? ''}
                  onChange={e => set('reimbursed_to', e.target.value)}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Note */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">
              NOTE <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionali</span>
            </div>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Note aggiuntive..."
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

          {/* Ricevuta (solo cost/rimborso) */}
          <AnimatePresence>
            {isCostLike(form.type) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{    opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">
                  RICEVUTA <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale · foto o PDF</span>
                </div>

                {/* Existing receipt */}
                {form.receipt_url && !fileToUpload && (
                  <div className="flex items-center gap-2 mb-2 text-[11px] text-[#7a4a4a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
                    <Paperclip size={11} className="text-[#731515]" />
                    <a href={form.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[#731515] hover:underline truncate flex items-center gap-1">
                      Allegato esistente <ExternalLink size={10} />
                    </a>
                    <button
                      onClick={() => set('receipt_url', null)}
                      className="ml-auto text-[#7a4a4a]/40 hover:text-[#731515] transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* File picker */}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#eddada] rounded-lg cursor-pointer hover:border-[#731515]/40 hover:bg-[#fdf6f6] transition-colors">
                  <Upload size={13} className="text-[#7a4a4a]/50 shrink-0" />
                  <span className="text-[11px] text-[#7a4a4a]/60 truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {fileToUpload ? fileToUpload.name : 'Seleziona file…'}
                  </span>
                  {fileToUpload && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setFileToUpload(null); }}
                      className="ml-auto text-[#7a4a4a]/40 hover:text-[#731515] shrink-0"
                    >
                      <X size={11} />
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => setFileToUpload(e.target.files?.[0] ?? null)}
                  />
                </label>

                {uploadPct !== null && (
                  <div className="mt-2 h-1 bg-[#eddada] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#731515] transition-all duration-300"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (uploadPct !== null ? 'CARICAMENTO…' : 'SALVATAGGIO…') : isNew ? 'AGGIUNGI' : 'SALVA'}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/40 transition-colors"
            >
              ANNULLA
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Delete Confirm Modal
───────────────────────────────────────────── */
function DeleteModal({ tx, onConfirm, onClose }: {
  tx:        Transaction;
  onConfirm: () => Promise<void>;
  onClose:   () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="px-6 py-6 text-center">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={18} className="text-[#731515]" />
          </div>
          <h3 className="text-base font-light text-[#1a0505] mb-2" style={{ fontFamily: 'var(--font-syne)' }}>
            Elimina transazione
          </h3>
          <p className="text-sm text-[#7a4a4a]/70 mb-6 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
            Sei sicuro di voler eliminare <strong>&ldquo;{tx.description}&rdquo;</strong>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => { setDeleting(true); await onConfirm(); onClose(); }}
              disabled={deleting}
              className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
            >
              {deleting ? 'ELIMINAZIONE…' : 'ELIMINA'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/40 transition-colors"
            >
              ANNULLA
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Category Bar Chart
───────────────────────────────────────────── */
function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const map: Record<string, { revenue: number; cost: number }> = {};
    for (const tx of transactions) {
      if (!map[tx.category]) map[tx.category] = { revenue: 0, cost: 0 };
      if (tx.type === 'revenue') map[tx.category].revenue += tx.amount;
      else                       map[tx.category].cost    += tx.amount; // cost + rimborso
    }
    return Object.entries(map)
      .map(([cat, v]) => ({ cat, ...v, total: v.revenue + v.cost }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.cost)), 1);

  return (
    <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
      <div className="flex items-center gap-4 mb-5">
        <div className="text-[9px] tracking-[0.42em] text-[#731515]">BREAKDOWN PER CATEGORIA</div>
        <div className="flex items-center gap-4 ml-auto">
          <span className="flex items-center gap-1.5 text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Revenue
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Costi / Rimborsi
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {data.map(({ cat, revenue, cost }) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#1a0505] font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>{cat}</span>
              <div className="flex items-center gap-3">
                {revenue > 0 && (
                  <span className="text-[10px] text-emerald-600" style={{ fontFamily: 'var(--font-nunito)' }}>+{fmtEur(revenue)}</span>
                )}
                {cost > 0 && (
                  <span className="text-[10px] text-red-500" style={{ fontFamily: 'var(--font-nunito)' }}>−{fmtEur(cost)}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {revenue > 0 && (
                <div className="h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(revenue / maxVal) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              )}
              {cost > 0 && (
                <div className="h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-red-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(cost / maxVal) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function FinanceManager() {
  const [transactions,  setTransactions]  = useState<Transaction[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [addModal,      setAddModal]      = useState(false);
  const [editTarget,    setEditTarget]    = useState<Transaction | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Transaction | null>(null);

  const MONTHS = useMemo(() => generateMonths(24), []);
  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());

  // Ref for the active pill — used to scroll it into view
  const activePillRef = useRef<HTMLButtonElement>(null);

  // Scroll the active pill into view whenever the selection changes
  useEffect(() => {
    activePillRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline:   'center',
      block:    'nearest',
    });
  }, [selYear, selMonth]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) setTransactions(data as Transaction[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // After data loads: if the current month has no transactions, jump to the
  // most recent month that does. Fixes the case where data is all in a past
  // month and the default (current month) would show an empty table.
  useEffect(() => {
    if (transactions.length === 0) return;
    const currentPrefix = monthKey(now.getFullYear(), now.getMonth());
    const hasCurrentMonth = transactions.some(tx => tx.date.startsWith(currentPrefix));
    if (hasCurrentMonth) return; // current month has data — keep default
    // transactions are already sorted descending by date; first entry = most recent
    const newest = transactions[0];
    if (!newest?.date) return;
    const y = parseInt(newest.date.slice(0, 4), 10);
    const m = parseInt(newest.date.slice(5, 7), 10) - 1; // 0-indexed
    if (!isNaN(y) && !isNaN(m)) {
      setSelYear(y);
      setSelMonth(m);
    }
  }, [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── CRUD ── */
  async function handleAdd(form: FormData) {
    const { data: { session } } = await supabase.auth.getSession();
    const payload = { ...form, created_by: session?.user.id ?? null };
    const { data, error } = await supabase.from('transactions').insert(payload).select().single();
    if (error) throw new Error(error.message);
    setTransactions(prev => [data as Transaction, ...prev]);
  }

  async function handleEdit(form: FormData) {
    if (!editTarget) return;
    const { data, error } = await supabase
      .from('transactions').update(form).eq('id', editTarget.id).select().single();
    if (error) throw new Error(error.message);
    setTransactions(prev => prev.map(t => t.id === editTarget.id ? data as Transaction : t));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('transactions').delete().eq('id', deleteTarget.id);
    if (error) throw new Error(error.message);
    setTransactions(prev => prev.filter(t => t.id !== deleteTarget.id));
  }

  /* ── All-time KPIs ── */
  const totalRevenue = transactions
    .filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
  const totalCost = transactions
    .filter(t => isCostLike(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalSaldo = totalRevenue - totalCost;

  /* ── Monthly map: key = "YYYY-MM" ── */
  const monthlyMap = useMemo(() => {
    const map: Record<string, { revenue: number; cost: number }> = {};
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7); // "YYYY-MM" — robust regardless of what follows
      if (!map[key]) map[key] = { revenue: 0, cost: 0 };
      if (tx.type === 'revenue') map[key].revenue += tx.amount;
      else                       map[key].cost    += tx.amount;
    }
    return map;
  }, [transactions]);

  /* ── Transactions for selected month ── */
  const monthTxs = useMemo(() =>
    transactions
      .filter(tx => txInMonth(tx, selYear, selMonth))
      .sort((a, b) => b.date.localeCompare(a.date)),
  [transactions, selYear, selMonth]);

  const monthRevenue = monthTxs.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
  const monthCost    = monthTxs.filter(t => isCostLike(t.type)).reduce((s, t)    => s + t.amount, 0);
  const monthSaldo   = monthRevenue - monthCost;

  /* ── Month navigation ── */
  function prevMonth() {
    const d = new Date(selYear, selMonth - 1, 1);
    setSelYear(d.getFullYear()); setSelMonth(d.getMonth());
  }
  function nextMonth() {
    const d = new Date(selYear, selMonth + 1, 1);
    setSelYear(d.getFullYear()); setSelMonth(d.getMonth());
  }
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();
  const isFirstAvail   = selYear === MONTHS[0].year && selMonth === MONTHS[0].month;

  return (
    <div className="space-y-6">
      {/* Modals */}
      <AnimatePresence>
        {addModal && (
          <TxModal key="add" initial={null} onSave={handleAdd} onClose={() => setAddModal(false)} />
        )}
        {editTarget && (
          <TxModal
            key="edit"
            initial={{
              date:          editTarget.date,
              description:   editTarget.description,
              category:      editTarget.category,
              type:          editTarget.type,
              amount:        editTarget.amount,
              notes:         editTarget.notes,
              receipt_url:   editTarget.receipt_url,
              reimbursed_to: editTarget.reimbursed_to,
            }}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
        {deleteTarget && (
          <DeleteModal key="del" tx={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">ADMIN · FINANCE</div>
          <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
            Gestione Finanziaria
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#eddada] bg-white text-[#7a4a4a] text-[10px] tracking-[0.25em] rounded-lg hover:border-[#731515]/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            AGGIORNA
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#731515] text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-[#9b2323] transition-colors"
          >
            <Plus size={11} />
            AGGIUNGI
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={15} className="text-emerald-600" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">TOTALE REVENUES</span>
          </div>
          <div className="text-2xl font-light text-emerald-600" style={{ fontFamily: 'var(--font-syne)' }}>
            {fmtEur(totalRevenue)}
          </div>
          <div className="text-[10px] text-[#7a4a4a]/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            {transactions.filter(t => t.type === 'revenue').length} entrate
          </div>
        </div>

        <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <TrendingDown size={15} className="text-red-500" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">TOTALE COSTI</span>
          </div>
          <div className="text-2xl font-light text-red-500" style={{ fontFamily: 'var(--font-syne)' }}>
            {fmtEur(totalCost)}
          </div>
          <div className="text-[10px] text-[#7a4a4a]/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            {transactions.filter(t => isCostLike(t.type)).length} uscite (costi + rimborsi)
          </div>
        </div>

        <div className={`rounded-xl p-5 shadow-[0_2px_12px_rgba(107,26,26,0.12)] ${totalSaldo >= 0 ? 'bg-[#731515]' : 'bg-[#4a0a0a]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Wallet size={15} className="text-white/80" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-white/60">SALDO DI CASSA</span>
          </div>
          <div className="text-3xl font-light text-white" style={{ fontFamily: 'var(--font-syne)' }}>
            {totalSaldo >= 0 ? '+' : ''}{fmtEur(totalSaldo)}
          </div>
          <div className="text-[10px] text-white/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            Revenues − Costi cumulativi
          </div>
        </div>
      </div>

      {/* ── Month selector ── */}
      <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#eddada]">
          <button
            onClick={prevMonth}
            disabled={isFirstAvail}
            className="p-1.5 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-[10px] tracking-[0.4em] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
            {MONTHS_IT[selMonth].toUpperCase()} {selYear}
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex overflow-x-auto px-4 py-3 gap-2 scrollbar-none">
          {MONTHS.map(({ year, month }) => {
            const key   = monthKey(year, month);
            const mData = monthlyMap[key] ?? { revenue: 0, cost: 0 };
            const mSaldo   = mData.revenue - mData.cost;
            const isActive = year === selYear && month === selMonth;
            const hasData  = mData.revenue > 0 || mData.cost > 0;
            return (
              <button
                key={key}
                ref={isActive ? activePillRef : undefined}
                onClick={() => { setSelYear(year); setSelMonth(month); }}
                className={`shrink-0 px-3 py-2 rounded-lg text-center transition-all border min-w-[52px] ${
                  isActive
                    ? 'bg-[#731515] border-[#731515] text-white shadow-md'
                    : 'bg-white border-[#eddada] text-[#7a4a4a] hover:border-[#731515]/40'
                }`}
              >
                <div className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {MONTHS_SHORT[month]}
                </div>
                <div className="text-[9px] opacity-70">{year}</div>
                {hasData && (
                  <div className={`text-[9px] mt-0.5 font-medium ${
                    isActive
                      ? mSaldo >= 0 ? 'text-emerald-200' : 'text-red-200'
                      : mSaldo >= 0 ? 'text-emerald-500' : 'text-red-400'
                  }`}>
                    {mSaldo >= 0 ? '+' : ''}{Math.abs(mSaldo) >= 1000
                      ? `${(mSaldo / 1000).toFixed(1)}k`
                      : Math.round(mSaldo)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#eddada] border-t border-[#eddada]">
          {[
            { label: 'Revenues mese', value: monthRevenue, color: 'text-emerald-600' },
            { label: 'Costi mese',    value: monthCost,    color: 'text-red-500'     },
            { label: 'Saldo mese',    value: monthSaldo,   color: monthSaldo >= 0 ? 'text-[#731515]' : 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-4 py-3 text-center">
              <div className="text-[8px] tracking-[0.3em] text-[#7a4a4a]/50 mb-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                {label.toUpperCase()}
              </div>
              <div className={`text-sm font-medium ${color}`} style={{ fontFamily: 'var(--font-syne)' }}>
                {label === 'Saldo mese' && value >= 0 ? '+' : ''}{fmtEur(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transactions table ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
          {/* Header row */}
          <div className="grid grid-cols-[90px_1fr_110px_100px_110px_72px] gap-3 px-4 py-2.5 bg-[#fdf6f6] border-b border-[#eddada]">
            {['DATA','DESCRIZIONE','CATEGORIA','TIPO','IMPORTO',''].map((h, i) => (
              <div key={i} className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                {h}
              </div>
            ))}
          </div>

          {monthTxs.length === 0 ? (
            <div className="text-center py-12 text-[#7a4a4a]/40 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
              Nessuna transazione per {MONTHS_IT[selMonth]} {selYear}.
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#eddada]">
                {monthTxs.map(tx => {
                  const c = TYPE_CONFIG[tx.type];
                  return (
                    <div
                      key={tx.id}
                      className={`grid grid-cols-[90px_1fr_110px_100px_110px_72px] gap-3 items-center px-4 py-3 transition-colors ${c.bgRow} ${c.hoverRow}`}
                    >
                      {/* Data */}
                      <div className="text-[11px] text-[#7a4a4a]/70 font-mono tabular-nums">
                        {fmtDate(tx.date)}
                      </div>

                      {/* Descrizione + note + rimborsato a */}
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#1a0505] truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                          {tx.description}
                        </div>
                        {tx.reimbursed_to && (
                          <div className="text-[10px] text-orange-500 truncate mt-0.5">↩ {tx.reimbursed_to}</div>
                        )}
                        {tx.notes && (
                          <div className="text-[10px] text-[#7a4a4a]/50 truncate mt-0.5">{tx.notes}</div>
                        )}
                      </div>

                      {/* Categoria */}
                      <div>
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${c.badgeCls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                          {tx.category}
                        </span>
                      </div>

                      {/* Tipo */}
                      <div className={`text-[10px] tracking-[0.15em] font-medium ${c.textCls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                        {tx.type === 'revenue' ? '▲ REV' : tx.type === 'rimborso' ? '↩ RIM' : '▼ COST'}
                      </div>

                      {/* Importo */}
                      <div className={`text-sm font-semibold tabular-nums ${c.textCls}`} style={{ fontFamily: 'var(--font-syne)' }}>
                        {c.prefix}{fmtEur(tx.amount)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 justify-end">
                        {tx.receipt_url && (
                          <a
                            href={tx.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Apri ricevuta"
                            className="p-1.5 rounded-lg text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-white/80 transition-colors"
                          >
                            <Paperclip size={12} />
                          </a>
                        )}
                        <button
                          onClick={() => setEditTarget(tx)}
                          className="p-1.5 rounded-lg text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-white/80 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tx)}
                          className="p-1.5 rounded-lg text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotale */}
              <div className="grid grid-cols-[90px_1fr_110px_100px_110px_72px] gap-3 items-center px-4 py-3 border-t-2 border-[#eddada] bg-[#fdf6f6]">
                <div className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/50">SUBTOTALE</div>
                <div />
                <div />
                <div className="text-[9px] tracking-[0.2em] text-[#7a4a4a]/50">{monthTxs.length} mov.</div>
                <div className={`text-sm font-semibold tabular-nums ${monthSaldo >= 0 ? 'text-emerald-700' : 'text-red-600'}`} style={{ fontFamily: 'var(--font-syne)' }}>
                  {monthSaldo >= 0 ? '+' : ''}{fmtEur(monthSaldo)}
                </div>
                <div />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Category breakdown ── */}
      {!loading && monthTxs.length > 0 && (
        <CategoryBreakdown transactions={monthTxs} />
      )}
    </div>
  );
}
