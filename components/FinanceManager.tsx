'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, TrendingUp, TrendingDown, Wallet,
  ChevronLeft, ChevronRight, Pencil, Trash2, RefreshCw,
  Paperclip, ExternalLink, Upload, Clock, Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import FounderAccounts from './FounderAccounts';
import { FINANCE_EMAILS } from '@/lib/admins';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type TxType = 'revenue' | 'cost' | 'rimborso';

type Category =
  | 'Evento' | 'Membership' | 'Sponsorship'
  | 'Merchandise' | 'Affitto' | 'Marketing' | 'Altro';

interface BudgetCategory {
  id:   string;
  name: string;
  type: 'revenue' | 'cost' | 'both';
}

interface Transaction {
  id:                  string;
  date:                string; // "YYYY-MM-DD" from Supabase
  description:         string;
  category:            Category;
  type:                TxType;
  amount:              number;
  notes:               string | null;
  receipt_url:         string | null;
  reimbursed_to:       string | null;
  budget_category:     string | null;
  registered_by_name:  string | null;
  assigned_to:         string;
  status:              'confirmed' | 'forecast';
  created_by:          string | null;
  created_at:          string;
}

type FormData = Omit<Transaction, 'id' | 'created_by' | 'created_at'>;

/* ─────────────────────────────────────────────
   Team member type (mirrors /api/team/members)
───────────────────────────────────────────── */
interface TeamMember { name: string; email: string; initials: string; }

/* ─────────────────────────────────────────────
   Revenue category groups (for grouped <select>)
───────────────────────────────────────────── */
const REVENUE_GROUPS: { label: string; items: string[] }[] = [
  { label: 'VENDITE',     items: ['Vendita Biglietti Eventi', 'Vendita Merch', 'Vendita Vino'] },
  { label: 'MEMBERSHIP',  items: ['Quote Membership', 'Rinnovi Membership'] },
  { label: 'EVENTI',      items: ['Incassi Door', 'Sponsorizzazioni Evento'] },
  { label: 'PARTNERSHIP', items: ['Sponsorizzazioni Brand', 'Collaborazioni', 'Commissioni Partner'] },
  { label: 'ALTRO',       items: ['Donazioni / Contributi', 'Altro'] },
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

/**
 * True if a transaction represents real cash moving in/out of the Club's own
 * account. A cost/revenue "assigned_to" a member (not Club) means a member
 * personally fronted/collected the money — no Club cash has moved yet, so it
 * must not hit the cash saldo. It only becomes real Club cash when the
 * matching Conti Member obligation is settled (see FounderAccounts), which
 * auto-creates a 'rimborso' (or 'revenue') transaction — always assigned to
 * Club — for the actual transfer. 'rimborso' transactions are therefore
 * always real cash movements.
 */
function isClubCash(tx: Pick<Transaction, 'type' | 'assigned_to'>) {
  if (tx.type === 'rimborso') return true;
  return !tx.assigned_to || tx.assigned_to === 'Club';
}

/** Returns status based on date: future dates → forecast, today/past → confirmed */
function statusFromDate(dateStr: string): 'confirmed' | 'forecast' {
  return dateStr > localToday() ? 'forecast' : 'confirmed';
}

function generateMonths(pastCount: number, futureCount = 0): { year: number; month: number }[] {
  const result = [];
  const now = new Date();
  for (let i = pastCount - 1; i >= -futureCount; i--) {
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
   Add Category Mini-Modal
───────────────────────────────────────────── */
function AddCategoryModal({
  txType,
  onSave,
  onClose,
}: {
  txType:  TxType;
  onSave:  (cat: BudgetCategory) => void;
  onClose: () => void;
}) {
  const [name,    setName]    = useState('');
  const [catType, setCatType] = useState<'revenue' | 'cost' | 'both'>(
    txType === 'revenue' ? 'revenue' : 'cost'
  );
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSave() {
    if (!name.trim()) { setError('Il nome è obbligatorio.'); return; }
    setSaving(true); setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbErr } = await (supabase as any)
        .from('budget_categories')
        .insert({ name: name.trim(), type: catType })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);
      onSave(data as BudgetCategory);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls2 =
    'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-sm ' +
    'placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eddada]">
          <div className="text-[9px] tracking-[0.4em] text-[#731515]">NUOVA VOCE DI BILANCIO</div>
          <button onClick={onClose} aria-label="Chiudi" className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[#7a4a4a]/50 hover:text-[#731515] transition-colors rounded-lg"><X size={15} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOME VOCE</div>
            <input
              className={inputCls2}
              placeholder="Es. Contributi eventi speciali…"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
            />
          </div>
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TIPO</div>
            <div className="grid grid-cols-3 gap-2">
              {(['revenue', 'cost', 'both'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCatType(t)}
                  className={`py-2 rounded-lg text-[10px] tracking-[0.1em] font-medium transition-all border ${
                    catType === t
                      ? 'bg-[#731515] text-white border-[#731515]'
                      : 'bg-white text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/30'
                  }`}
                >
                  {t === 'revenue' ? 'Entrata' : t === 'cost' ? 'Uscita' : 'Entrambi'}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
            >
              {saving ? 'SALVATAGGIO…' : 'AGGIUNGI'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.25em] rounded-lg hover:border-[#731515]/40 transition-colors"
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
   Add / Edit Modal
───────────────────────────────────────────── */
const EMPTY_FORM: FormData = {
  date:                localToday(),
  description:         '',
  category:            'Evento',
  type:                'revenue',
  amount:              0,
  notes:               null,
  receipt_url:         null,
  reimbursed_to:       null,
  budget_category:     null,
  registered_by_name:  null,
  assigned_to:         'Club',
  status:              'confirmed',
};

function TxModal({
  initial,
  onSave,
  onClose,
  budgetCategories,
  onCategoryAdded,
  currentUserName,
  teamMembers,
}: {
  initial:          FormData | null;
  onSave:           (data: FormData) => Promise<void>;
  onClose:          () => void;
  budgetCategories: BudgetCategory[];
  onCategoryAdded:  (cat: BudgetCategory) => void;
  currentUserName:  string | null;
  teamMembers:      TeamMember[];
}) {
  const defaultForm: FormData = initial ?? {
    ...EMPTY_FORM,
    date:               localToday(),
    registered_by_name: currentUserName,
    status:             'confirmed',
  };
  const [form,         setForm]         = useState<FormData>(defaultForm);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [uploadPct,    setUploadPct]    = useState<number | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [showAddCat,   setShowAddCat]   = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const filteredCats = budgetCategories.filter(c =>
    form.type === 'revenue' ? c.type === 'revenue' || c.type === 'both'
                            : c.type === 'cost'    || c.type === 'both'
  );

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
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eddada] shrink-0 bg-white z-10">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">
              {isNew ? 'NUOVA TRANSAZIONE' : 'MODIFICA TRANSAZIONE'}
            </div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {isNew ? 'Aggiungi movimento' : form.description}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[#7a4a4a]/50 hover:text-[#731515] transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>

        <div className="px-6 py-5 space-y-4">
          {/* Tipo — 2 buttons (rimborso is set automatically by Conti Founder) */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-2">TIPO</div>
            <div className="grid grid-cols-2 gap-2">
              {(['revenue', 'cost'] as TxType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { set('type', t); set('budget_category', null); }}
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
                onChange={e => {
                  set('date', e.target.value);
                  set('status', statusFromDate(e.target.value));
                }}
                style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
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
                style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Stato (Confermato / Previsto) */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">STATO</div>
            <div className="grid grid-cols-2 gap-2">
              {(['confirmed', 'forecast'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`py-2 rounded-lg text-[10px] tracking-[0.1em] font-medium transition-all border flex items-center justify-center gap-1.5 ${
                    form.status === s
                      ? s === 'confirmed'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-amber-400 text-white border-amber-400'
                      : 'bg-white text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/30'
                  }`}
                >
                  {s === 'confirmed'
                    ? <><span className="text-[11px]">✓</span> CONFERMATO</>
                    : <><Clock size={10} /> PREVISTO</>}
                </button>
              ))}
            </div>
            {form.status === 'forecast' && (
              <p className="text-[10px] text-amber-600 mt-1.5 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                Le operazioni previste non influenzano i totali confermati, ma compaiono nel cashflow previsionale.
              </p>
            )}
            {form.date > localToday() && form.status === 'confirmed' && (
              <p className="text-[10px] text-amber-600 mt-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                Data futura — considera di usare &ldquo;Previsto&rdquo;.
              </p>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DESCRIZIONE</div>
            <input
              className={inputCls}
              placeholder="Es. Biglietti evento Wine Party..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
            />
          </div>

          {/* Voce di Bilancio */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">VOCE DI BILANCIO</div>
            <select
              className={inputCls}
              value={form.budget_category ?? ''}
              onChange={e => {
                if (e.target.value === '__add__') { setShowAddCat(true); return; }
                set('budget_category', e.target.value || null);
              }}
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
            >
              <option value="">— Seleziona voce —</option>
              {form.type === 'revenue' ? (
                <>
                  {(() => {
                    const grouped = new Set<string>();
                    return REVENUE_GROUPS.map(group => {
                      const cats = filteredCats.filter(c => group.items.includes(c.name));
                      cats.forEach(c => grouped.add(c.name));
                      if (cats.length === 0) return null;
                      return (
                        <optgroup key={group.label} label={group.label}>
                          {group.items
                            .filter(name => cats.some(c => c.name === name))
                            .map(name => {
                              const cat = cats.find(c => c.name === name)!;
                              return <option key={cat.id} value={cat.name}>{cat.name}</option>;
                            })}
                        </optgroup>
                      );
                    }).concat(
                      // Categorie personalizzate non in nessun gruppo
                      (() => {
                        const extra = filteredCats.filter(c => !grouped.has(c.name));
                        if (extra.length === 0) return null;
                        return (
                          <optgroup key="__custom__" label="PERSONALIZZATE">
                            {extra.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </optgroup>
                        );
                      })()
                    );
                  })()}
                </>
              ) : (
                filteredCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
              )}
              <option value="__add__">+ Aggiungi nuova voce…</option>
            </select>
          </div>

          {/* Registrato da */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">
              REGISTRATO DA <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span>
            </div>
            <select
              className={inputCls}
              value={form.registered_by_name ?? ''}
              onChange={e => set('registered_by_name', e.target.value || null)}
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
            >
              <option value="">— Seleziona membro —</option>
              {teamMembers.map(f => (
                <option key={f.email} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Assegnato a */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">
              ASSEGNATO A <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span>
            </div>
            <select
              className={inputCls}
              value={form.assigned_to}
              onChange={e => set('assigned_to', e.target.value)}
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
            >
              <option value="Club">Club (nessuna persona)</option>
              {teamMembers.map(f => (
                <option key={f.email} value={f.name}>{f.name}</option>
              ))}
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
                  style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
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
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
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

          {/* Add Category Mini-Modal */}
          <AnimatePresence>
            {showAddCat && (
              <AddCategoryModal
                txType={form.type}
                onSave={(cat) => {
                  onCategoryAdded(cat);
                  set('budget_category', cat.name);
                  setShowAddCat(false);
                }}
                onClose={() => setShowAddCat(false)}
              />
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
        </div>{/* end scrollable area */}
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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
      const key = tx.budget_category ?? tx.category;
      if (!map[key]) map[key] = { revenue: 0, cost: 0 };
      if (tx.type === 'revenue') map[key].revenue += tx.amount;
      else                       map[key].cost    += tx.amount; // cost + rimborso
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
/* ─────────────────────────────────────────────
   Cashflow Previsionale component
───────────────────────────────────────────── */
function CashflowPrevisionale({ transactions, now }: { transactions: Transaction[]; now: Date }) {
  // Build a map for the next 12 months (from current month)
  const months = useMemo(() => {
    const result: { year: number; month: number; key: string }[] = [];
    for (let i = 0; i <= 11; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push({
        year:  d.getFullYear(),
        month: d.getMonth(),
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return result;
  }, [now]);

  const data = useMemo(() => {
    return months.map(({ year, month, key }) => {
      const mTxs = transactions.filter(tx => tx.date.startsWith(key));
      const confirmedRev  = mTxs.filter(t => t.type === 'revenue'   && t.status === 'confirmed' && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
      const confirmedCost = mTxs.filter(t => isCostLike(t.type)     && t.status === 'confirmed' && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
      const forecastRev   = mTxs.filter(t => t.type === 'revenue'   && t.status === 'forecast'  && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
      const forecastCost  = mTxs.filter(t => isCostLike(t.type)     && t.status === 'forecast'  && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
      const totalRev  = confirmedRev  + forecastRev;
      const totalCost = confirmedCost + forecastCost;
      const saldo     = totalRev - totalCost;
      return { year, month, key, confirmedRev, confirmedCost, forecastRev, forecastCost, totalRev, totalCost, saldo };
    });
  }, [months, transactions]);

  const hasAnyData = data.some(d => d.totalRev > 0 || d.totalCost > 0);
  if (!hasAnyData) return null;

  return (
    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
      <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-b border-amber-200">
        <Clock size={12} className="text-amber-600" />
        <span className="text-[9px] tracking-[0.4em] text-amber-700">CASHFLOW PREVISIONALE — PROSSIMI 12 MESI</span>
        <span className="ml-auto text-[9px] text-amber-500/70 normal-case tracking-normal" style={{ fontFamily: 'var(--font-nunito)' }}>
          ✓ confermato · ~ previsto
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]" style={{ fontFamily: 'var(--font-nunito)' }}>
          <thead>
            <tr className="border-b border-[#eddada]">
              <th className="px-4 py-2 text-left text-[9px] tracking-[0.25em] text-[#7a4a4a]/50 font-normal">MESE</th>
              <th className="px-4 py-2 text-right text-[9px] tracking-[0.25em] text-emerald-600/60 font-normal">RICAVI</th>
              <th className="px-4 py-2 text-right text-[9px] tracking-[0.25em] text-red-500/60 font-normal">COSTI</th>
              <th className="px-4 py-2 text-right text-[9px] tracking-[0.25em] text-[#7a4a4a]/50 font-normal">SALDO NETTO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5eded]">
            {data.map(({ year, month, key, confirmedRev, confirmedCost, forecastRev, forecastCost, totalRev, totalCost, saldo }) => {
              const isCurrent = key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              const isEmpty   = totalRev === 0 && totalCost === 0;
              if (isEmpty && !isCurrent) return null;
              return (
                <tr key={key} className={`${isCurrent ? 'bg-[#fdf6f6]' : 'hover:bg-[#fdf9f9]'} transition-colors`}>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-[#1a0505]">{MONTHS_SHORT[month]} {year}</span>
                    {isCurrent && <span className="ml-1.5 text-[8px] tracking-[0.1em] text-[#731515] bg-[#fdf0f0] px-1.5 py-0.5 rounded-full">OGGI</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {totalRev > 0 ? (
                      <div>
                        {confirmedRev > 0 && <div className="text-emerald-600">✓ {fmtEur(confirmedRev)}</div>}
                        {forecastRev  > 0 && <div className="text-amber-500">~ {fmtEur(forecastRev)}</div>}
                      </div>
                    ) : <span className="text-[#7a4a4a]/20">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {totalCost > 0 ? (
                      <div>
                        {confirmedCost > 0 && <div className="text-red-500">✓ {fmtEur(confirmedCost)}</div>}
                        {forecastCost  > 0 && <div className="text-amber-500">~ {fmtEur(forecastCost)}</div>}
                      </div>
                    ) : <span className="text-[#7a4a4a]/20">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {(totalRev > 0 || totalCost > 0) ? (
                      <span className={`font-semibold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {saldo >= 0 ? '+' : ''}{fmtEur(saldo)}
                      </span>
                    ) : <span className="text-[#7a4a4a]/20">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type FinanceTab = 'transazioni' | 'conti_founder';

export default function FinanceManager() {
  const [financeTab,       setFinanceTab]       = useState<FinanceTab>('transazioni');
  const [transactions,     setTransactions]     = useState<Transaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [addModal,         setAddModal]         = useState(false);
  const [editTarget,       setEditTarget]       = useState<Transaction | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<Transaction | null>(null);
  const [currentUserName,  setCurrentUserName]  = useState<string | null>(null);
  const [teamMembers,      setTeamMembers]      = useState<TeamMember[]>([]);

  const MONTHS = useMemo(() => generateMonths(24, 12), []);
  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  // 'all' shows both confirmed + forecast; 'confirmed' hides forecast; 'forecast' shows only forecast
  type StatusFilter = 'all' | 'confirmed' | 'forecast';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  async function loadBudgetCategories() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('budget_categories')
      .select('id, name, type')
      .order('name', { ascending: true });
    if (data) setBudgetCategories(data as BudgetCategory[]);
  }

  useEffect(() => {
    load();
    loadBudgetCategories();
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Get user's display name from session metadata
      const meta = session?.user?.user_metadata ?? {};
      const name = ((meta.full_name ?? meta.name ?? '') as string).trim() || null;
      setCurrentUserName(name);

      // Fetch team members dynamically (requires auth token)
      const token = session?.access_token ?? '';
      if (token) {
        fetch('/api/team/members', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => { if (d.members) setTeamMembers(d.members as TeamMember[]); })
          .catch(() => {/* keep empty */});
      }
    });

    // Realtime: pick up transactions auto-created elsewhere (e.g. settling
    // a Conti Member obligation inserts a 'rimborso'/'revenue' row) without
    // requiring a manual reload.
    const channel = supabase
      .channel('transactions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After data loads: if the current month has no confirmed transactions, jump to
  // the most recent month that does (past months only — don't auto-jump to future).
  useEffect(() => {
    if (transactions.length === 0) return;
    const currentPrefix = monthKey(now.getFullYear(), now.getMonth());
    const hasCurrentMonth = transactions.some(tx => tx.date.startsWith(currentPrefix) && tx.status === 'confirmed');
    if (hasCurrentMonth) return;
    // Sort confirmed transactions descending and find the most recent
    const confirmed = transactions.filter(t => t.status === 'confirmed' && t.date <= localToday());
    if (confirmed.length === 0) return;
    confirmed.sort((a, b) => b.date.localeCompare(a.date));
    const newest = confirmed[0];
    if (!newest?.date) return;
    const y = parseInt(newest.date.slice(0, 4), 10);
    const m = parseInt(newest.date.slice(5, 7), 10) - 1;
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

    // Auto-create founder_accounts entry when assigned to a specific founder
    if (form.assigned_to && form.assigned_to !== 'Club' && (form.type === 'cost' || form.type === 'revenue')) {
      // Use current teamMembers, or re-fetch if the list is empty (race condition fix)
      let currentMembers = teamMembers;
      if (currentMembers.length === 0 && session?.access_token) {
        try {
          const r = await fetch('/api/team/members', { headers: { Authorization: `Bearer ${session.access_token}` } });
          const d = await r.json();
          currentMembers = d.members ?? [];
          if (currentMembers.length > 0) setTeamMembers(currentMembers);
        } catch { /* keep empty */ }
      }

      const founderEmail = currentMembers.find(m => m.name === form.assigned_to)?.email;
      console.log('[FinanceManager] assigned_to:', form.assigned_to, '→ email:', founderEmail ?? 'NOT FOUND');

      if (founderEmail) {
        const movType  = form.type === 'cost' ? 'spesa_personale' : 'incasso_personale';
        const newTxId  = (data as Transaction).id;
        const faPayload = {
          date:           form.date,
          founder_email:  founderEmail,
          type:           movType,
          description:    form.description,
          amount:         form.amount,
          category:       form.budget_category ?? form.category,
          notes:          form.notes ?? null,
          receipt_url:    form.receipt_url ?? null,
          settled:        false,
          transaction_id: newTxId,
          created_by:     session?.user.id ?? null,
        };
        const { error: faError } = await supabase
          .from('founder_accounts')
          .insert(faPayload);
        if (faError) {
          console.error('[FinanceManager] founder_accounts insert FAILED:', faError);
        }
      } else {
        console.warn('[FinanceManager] no email found for assigned_to:', form.assigned_to, '— skipping founder_accounts');
      }
    }
  }

  async function handleEdit(form: FormData) {
    if (!editTarget) return;
    const { data, error } = await supabase
      .from('transactions').update(form).eq('id', editTarget.id).select().single();
    if (error) throw new Error(error.message);
    setTransactions(prev => prev.map(t => t.id === editTarget.id ? data as Transaction : t));

    // Keep the linked "Conti Member" obligation (founder_accounts) in sync —
    // editing a transaction used to leave it stale or missing entirely.
    const wasAssigned = !!editTarget.assigned_to && editTarget.assigned_to !== 'Club'
      && (editTarget.type === 'cost' || editTarget.type === 'revenue');
    const isAssigned = !!form.assigned_to && form.assigned_to !== 'Club'
      && (form.type === 'cost' || form.type === 'revenue');
    if (!wasAssigned && !isAssigned) return;

    const { data: { session } } = await supabase.auth.getSession();
    const { data: linkedRows } = await supabase
      .from('founder_accounts')
      .select('*')
      .eq('transaction_id', editTarget.id);
    const linked = (linkedRows as { id: string; settled: boolean }[] | null)?.[0] ?? null;

    if (linked?.settled) {
      // Money already moved for this obligation — never rewrite it silently.
      console.warn('[FinanceManager] transaction edited but linked founder_accounts is already settled — left untouched:', linked.id);
      return;
    }

    if (isAssigned) {
      let currentMembers = teamMembers;
      if (currentMembers.length === 0 && session?.access_token) {
        try {
          const r = await fetch('/api/team/members', { headers: { Authorization: `Bearer ${session.access_token}` } });
          const d = await r.json();
          currentMembers = d.members ?? [];
          if (currentMembers.length > 0) setTeamMembers(currentMembers);
        } catch { /* keep empty */ }
      }
      const founderEmail = currentMembers.find(m => m.name === form.assigned_to)?.email;
      if (!founderEmail) {
        console.warn('[FinanceManager] no email found for assigned_to:', form.assigned_to, '— skipping founder_accounts sync');
        return;
      }
      const movType = form.type === 'cost' ? 'spesa_personale' : 'incasso_personale';
      const faPayload = {
        date:           form.date,
        founder_email:  founderEmail,
        type:           movType,
        description:    form.description,
        amount:         form.amount,
        category:       form.budget_category ?? form.category,
        notes:          form.notes ?? null,
        receipt_url:    form.receipt_url ?? null,
        transaction_id: editTarget.id,
      };
      if (linked) {
        const { error: updErr } = await supabase.from('founder_accounts').update(faPayload).eq('id', linked.id);
        if (updErr) console.error('[FinanceManager] founder_accounts update FAILED:', updErr);
      } else {
        const { error: insErr } = await supabase.from('founder_accounts')
          .insert({ ...faPayload, settled: false, created_by: session?.user.id ?? null });
        if (insErr) console.error('[FinanceManager] founder_accounts insert FAILED:', insErr);
      }
    } else if (linked) {
      // No longer assigned to a member — the obligation no longer applies.
      const { error: delErr } = await supabase.from('founder_accounts').delete().eq('id', linked.id);
      if (delErr) console.error('[FinanceManager] founder_accounts cleanup FAILED:', delErr);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('transactions').delete().eq('id', deleteTarget.id);
    if (error) throw new Error(error.message);
    setTransactions(prev => prev.filter(t => t.id !== deleteTarget.id));
  }

  /* ── All-time KPIs (confirmed only) ── */
  const confirmedTxs = useMemo(() => transactions.filter(t => t.status === 'confirmed'), [transactions]);
  const forecastTxs  = useMemo(() => transactions.filter(t => t.status === 'forecast'),  [transactions]);
  const totalRevenue = confirmedTxs.filter(t => t.type === 'revenue' && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
  const totalCost    = confirmedTxs.filter(t => isCostLike(t.type) && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
  const totalSaldo   = totalRevenue - totalCost;
  const totalForecastRevenue = forecastTxs.filter(t => t.type === 'revenue' && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
  const totalForecastCost    = forecastTxs.filter(t => isCostLike(t.type) && isClubCash(t)).reduce((s, t) => s + t.amount, 0);

  /* ── Monthly map: key = "YYYY-MM" — confirmed only for pills ── */
  const monthlyMap = useMemo(() => {
    const map: Record<string, { revenue: number; cost: number; hasForecast: boolean }> = {};
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7);
      if (!map[key]) map[key] = { revenue: 0, cost: 0, hasForecast: false };
      if (tx.status === 'forecast') { map[key].hasForecast = true; continue; }
      if (!isClubCash(tx)) continue;
      if (tx.type === 'revenue') map[key].revenue += tx.amount;
      else                       map[key].cost    += tx.amount;
    }
    return map;
  }, [transactions]);

  /* ── Transactions for selected month ── */
  const monthTxsAll = useMemo(() =>
    transactions
      .filter(tx => txInMonth(tx, selYear, selMonth))
      .sort((a, b) => b.date.localeCompare(a.date)),
  [transactions, selYear, selMonth]);

  // Displayed list respects statusFilter; KPIs use all transactions in month
  const monthTxs = useMemo(() =>
    statusFilter === 'all' ? monthTxsAll : monthTxsAll.filter(tx => tx.status === statusFilter),
  [monthTxsAll, statusFilter]);

  // Confirmed-only stats (for KPI bar)
  const monthTxsConfirmed = useMemo(() =>
    monthTxsAll.filter(t => t.status === 'confirmed'),
  [monthTxsAll]);
  const monthRevenue = monthTxsConfirmed.filter(t => t.type === 'revenue' && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
  const monthCost    = monthTxsConfirmed.filter(t => isCostLike(t.type) && isClubCash(t)).reduce((s, t)    => s + t.amount, 0);
  const monthSaldo   = monthRevenue - monthCost;

  // Forecast stats for selected month
  const monthTxsForecast = useMemo(() =>
    monthTxsAll.filter(t => t.status === 'forecast'),
  [monthTxsAll]);
  const monthForecastRevenue = monthTxsForecast.filter(t => t.type === 'revenue' && isClubCash(t)).reduce((s, t) => s + t.amount, 0);
  const monthForecastCost    = monthTxsForecast.filter(t => isCostLike(t.type) && isClubCash(t)).reduce((s, t) => s + t.amount, 0);

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
  const isLastAvail    = selYear === MONTHS[MONTHS.length - 1].year && selMonth === MONTHS[MONTHS.length - 1].month;

  return (
    <div className="space-y-6">
      {/* Modals */}
      <AnimatePresence>
        {addModal && (
          <TxModal key="add" initial={null} onSave={handleAdd} onClose={() => setAddModal(false)}
            budgetCategories={budgetCategories}
            onCategoryAdded={(cat) => setBudgetCategories(prev => [...prev, cat].sort((a,b) => a.name.localeCompare(b.name)))}
            currentUserName={currentUserName}
            teamMembers={teamMembers}
          />
        )}
        {editTarget && (
          <TxModal
            key="edit"
            initial={{
              date:                editTarget.date,
              description:         editTarget.description,
              category:            editTarget.category,
              type:                editTarget.type,
              amount:              editTarget.amount,
              notes:               editTarget.notes,
              receipt_url:         editTarget.receipt_url,
              reimbursed_to:       editTarget.reimbursed_to,
              budget_category:     editTarget.budget_category,
              registered_by_name:  editTarget.registered_by_name,
              assigned_to:         editTarget.assigned_to ?? 'Club',
              status:              editTarget.status ?? 'confirmed',
            }}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
            budgetCategories={budgetCategories}
            onCategoryAdded={(cat) => setBudgetCategories(prev => [...prev, cat].sort((a,b) => a.name.localeCompare(b.name)))}
            currentUserName={currentUserName}
            teamMembers={teamMembers}
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
        {financeTab === 'transazioni' && (
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
        )}
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-[#fdf6f6] border border-[#eddada] rounded-xl p-1 w-fit">
        {([
          { id: 'transazioni',   label: 'Transazioni' },
          { id: 'conti_founder', label: 'Conti Member' },
        ] as { id: FinanceTab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFinanceTab(tab.id)}
            className={`px-5 py-2 text-[10px] tracking-[0.22em] rounded-lg transition-all duration-200 ${
              financeTab === tab.id
                ? 'bg-[#731515] text-white shadow-sm'
                : 'text-[#7a4a4a] hover:text-[#731515]'
            }`}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {financeTab === 'conti_founder' && <FounderAccounts />}

      {financeTab === 'transazioni' && <>
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
            {confirmedTxs.filter(t => t.type === 'revenue').length} entrate confermate
            {totalForecastRevenue > 0 && <span className="ml-1 text-amber-500">+{fmtEur(totalForecastRevenue)} prev.</span>}
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
            {confirmedTxs.filter(t => isCostLike(t.type)).length} uscite confermate
            {totalForecastCost > 0 && <span className="ml-1 text-amber-500">+{fmtEur(totalForecastCost)} prev.</span>}
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
            Revenues − Costi (solo confermati)
            {forecastTxs.length > 0 && <span className="block text-amber-200/70">{forecastTxs.length} previsionali esclusi</span>}
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
            disabled={isLastAvail}
            className="p-1.5 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex overflow-x-auto px-4 py-3 gap-2 scrollbar-none">
          {MONTHS.map(({ year, month }) => {
            const key   = monthKey(year, month);
            const mData = monthlyMap[key] ?? { revenue: 0, cost: 0, hasForecast: false };
            const mSaldo       = mData.revenue - mData.cost;
            const isActive     = year === selYear && month === selMonth;
            const isFutureMo   = key > monthKey(now.getFullYear(), now.getMonth());
            const hasConfirmed = mData.revenue > 0 || mData.cost > 0;
            return (
              <button
                key={key}
                ref={isActive ? activePillRef : undefined}
                onClick={() => { setSelYear(year); setSelMonth(month); }}
                className={`shrink-0 px-3 py-2 rounded-lg text-center transition-all border min-w-[52px] ${
                  isActive
                    ? isFutureMo
                      ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                      : 'bg-[#731515] border-[#731515] text-white shadow-md'
                    : isFutureMo
                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400'
                      : 'bg-white border-[#eddada] text-[#7a4a4a] hover:border-[#731515]/40'
                }`}
              >
                <div className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {MONTHS_SHORT[month]}
                </div>
                <div className="text-[9px] opacity-70">{year}</div>
                {hasConfirmed && (
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
                {!hasConfirmed && mData.hasForecast && (
                  <div className={`text-[9px] mt-0.5 ${isActive ? 'text-white/70' : 'text-amber-500'}`}>~</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#eddada] border-t border-[#eddada]">
          {[
            { label: 'Revenues',    value: monthRevenue, forecast: monthForecastRevenue, color: 'text-emerald-600' },
            { label: 'Costi',       value: monthCost,    forecast: monthForecastCost,    color: 'text-red-500'     },
            { label: 'Saldo mese',  value: monthSaldo,   forecast: monthForecastRevenue - monthForecastCost, color: monthSaldo >= 0 ? 'text-[#731515]' : 'text-red-600' },
          ].map(({ label, value, forecast, color }) => (
            <div key={label} className="px-4 py-3 text-center">
              <div className="text-[8px] tracking-[0.3em] text-[#7a4a4a]/50 mb-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                {label.toUpperCase()}
              </div>
              <div className={`text-sm font-medium ${color}`} style={{ fontFamily: 'var(--font-syne)' }}>
                {label === 'Saldo mese' && value >= 0 ? '+' : ''}{fmtEur(value)}
              </div>
              {forecast !== 0 && (
                <div className="text-[9px] text-amber-500 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {forecast > 0 ? '+' : ''}{fmtEur(forecast)} prev.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Status filter ── */}
      {!loading && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={11} className="text-[#7a4a4a]/40" />
          {([
            { key: 'all',       label: 'Tutti' },
            { key: 'confirmed', label: 'Solo confermati' },
            { key: 'forecast',  label: 'Solo previsti' },
          ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1 rounded-full text-[10px] tracking-[0.1em] border transition-all ${
                statusFilter === key
                  ? key === 'forecast'
                    ? 'bg-amber-400 text-white border-amber-400'
                    : 'bg-[#731515] text-white border-[#731515]'
                  : 'bg-white text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/40'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Transactions table ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
          {/* Header row */}
          <div className="grid grid-cols-[90px_1fr_110px_100px_110px_72px] gap-3 px-4 py-2.5 bg-[#fdf6f6] border-b border-[#eddada]">
            {['DATA','DESCRIZIONE','VOCE','TIPO','IMPORTO',''].map((h, i) => (
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
                      className={`grid grid-cols-[90px_1fr_110px_100px_110px_72px] gap-3 items-center px-4 py-3 transition-colors ${tx.status === 'forecast' ? 'opacity-80 border-l-2 border-amber-300' : ''} ${c.bgRow} ${c.hoverRow}`}
                    >
                      {/* Data */}
                      <div className="text-[11px] text-[#7a4a4a]/70 font-mono tabular-nums">
                        {fmtDate(tx.date)}
                        {tx.status === 'forecast' && (
                          <div className="flex items-center gap-0.5 mt-0.5 text-amber-500">
                            <Clock size={9} />
                            <span className="text-[8px] tracking-[0.1em]">PREV.</span>
                          </div>
                        )}
                      </div>

                      {/* Descrizione + note + rimborsato a + registrato da */}
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
                        {tx.registered_by_name && (
                          <div className="mt-1">
                            <span className="inline-block text-[9px] tracking-[0.15em] text-[#7a4a4a]/50 bg-[#f5f0f0] border border-[#eddada] px-1.5 py-0.5 rounded" style={{ fontFamily: 'var(--font-nunito)' }}>
                              {tx.registered_by_name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Categoria */}
                      <div>
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${c.badgeCls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                          {tx.budget_category ?? tx.category}
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

      {/* ── Cashflow Previsionale ── */}
      {!loading && forecastTxs.length > 0 && (
        <CashflowPrevisionale transactions={transactions} now={now} />
      )}
      </>}
    </div>
  );
}
