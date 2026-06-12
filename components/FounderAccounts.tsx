'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Check, Upload, Paperclip, ExternalLink,
  RefreshCw, TrendingUp, TrendingDown, Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const FOUNDERS = [
  { name: 'Giacomo',   initials: 'GG', email: 'giacomogallo1310@gmail.com'   },
  { name: 'Filippo',   initials: 'FL', email: 'filippo.lombardi890@gmail.com' },
  { name: 'Cristiano', initials: 'CM', email: 'cristianomichelotti@gmail.com' },
  { name: 'Marcello',  initials: 'MA', email: 'marcelloabbadati02@gmail.com'  },
];

const CATEGORIES = ['Evento', 'Membership', 'Marketing', 'Operativo', 'Merch', 'Altro'];

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type MovType = 'spesa_personale' | 'incasso_personale' | 'rimborso_club' | 'trasferimento_club';

interface Movement {
  id:            string;
  date:          string;
  founder_email: string;
  type:          MovType;
  description:   string;
  amount:        number;
  category:      string | null;
  receipt_url:   string | null;
  settled:       boolean;
  settled_date:  string | null;
  notes:         string | null;
  created_by:    string | null;
  created_at:    string;
}

/* ─────────────────────────────────────────────
   Type config
   amountSign: how the entry affects the Club's debt to the founder
     +1 → Club owes founder more  (spesa / trasferimento)
     -1 → Club owes founder less  (incasso / rimborso)
───────────────────────────────────────────── */
const TYPE_CFG: Record<MovType, {
  label:       string;
  short:       string;
  badgeCls:    string;
  amountSign:  1 | -1;
  colorCls:    string;
}> = {
  spesa_personale:    { label: 'Spesa personale',       short: 'SPESA',     badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',      amountSign:  1, colorCls: 'text-blue-600'    },
  incasso_personale:  { label: 'Incasso personale',     short: 'INCASSO',   badgeCls: 'bg-orange-50 text-orange-700 border-orange-200', amountSign: -1, colorCls: 'text-orange-600'  },
  rimborso_club:      { label: 'Rimborso dal Club',     short: 'RIMBORSO',  badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200', amountSign: -1, colorCls: 'text-emerald-600' },
  trasferimento_club: { label: 'Trasferimento al Club', short: 'TRASFERI.', badgeCls: 'bg-purple-50 text-purple-700 border-purple-200', amountSign:  1, colorCls: 'text-purple-600'  },
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Math.abs(n));
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** balance > 0 → Club owes founder · balance < 0 → founder owes Club */
function founderBalance(movements: Movement[], email: string) {
  return movements
    .filter(m => m.founder_email === email)
    .reduce((sum, m) => sum + m.amount * TYPE_CFG[m.type].amountSign, 0);
}

const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-sm ' +
  'placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

/* ─────────────────────────────────────────────
   Add Movement Modal
───────────────────────────────────────────── */
interface FormState {
  founder_email: string;
  type:          MovType;
  date:          string;
  description:   string;
  amount:        string;
  category:      string;
  notes:         string;
}

const EMPTY_FORM: FormState = {
  founder_email: FOUNDERS[0].email,
  type:          'spesa_personale',
  date:          localToday(),
  description:   '',
  amount:        '',
  category:      'Evento',
  notes:         '',
};

function AddModal({
  onSave,
  onClose,
}: {
  onSave:  (data: Omit<Movement, 'id' | 'created_by' | 'created_at' | 'settled' | 'settled_date' | 'receipt_url'> & { receipt_url: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, date: localToday() });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function handleSave() {
    if (!form.description.trim()) { setError('Descrizione obbligatoria.'); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError('Importo non valido.'); return; }
    setSaving(true); setError(null);

    let receipt_url: string | null = null;
    if (file) {
      const ext  = file.name.split('.').pop() ?? 'bin';
      const path = `founders/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file, { upsert: false });
      if (upErr) { setError(`Upload: ${upErr.message}`); setSaving(false); return; }
      receipt_url = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
    }

    try {
      await onSave({
        date:          form.date,
        founder_email: form.founder_email,
        type:          form.type,
        description:   form.description.trim(),
        amount:        amt,
        category:      form.category || null,
        notes:         form.notes.trim() || null,
        receipt_url,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  const isPrimaryType = form.type === 'spesa_personale' || form.type === 'incasso_personale';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
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
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">CONTI FOUNDER</div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>Registra movimento</h3>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors p-1"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Founder */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">FOUNDER</div>
            <div className="grid grid-cols-4 gap-2">
              {FOUNDERS.map(f => (
                <button
                  key={f.email}
                  onClick={() => set('founder_email', f.email)}
                  className={`py-2.5 rounded-lg text-[11px] font-medium transition-all border ${
                    form.founder_email === f.email
                      ? 'bg-[#731515] text-white border-[#731515]'
                      : 'bg-white text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/30'
                  }`}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TIPO</div>
            <div className="grid grid-cols-2 gap-2">
              {(['spesa_personale', 'incasso_personale', 'rimborso_club', 'trasferimento_club'] as MovType[]).map(t => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`py-2.5 rounded-lg text-[10px] tracking-[0.1em] font-medium transition-all border ${
                    form.type === t
                      ? `${TYPE_CFG[t].badgeCls} border-current`
                      : 'bg-white text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/30'
                  }`}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {TYPE_CFG[t].label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#7a4a4a]/50 mt-1.5 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
              {form.type === 'spesa_personale'    && 'Il founder ha pagato di tasca propria per il Club → il Club gli deve rimborsare.'}
              {form.type === 'incasso_personale'  && 'Il founder ha incassato soldi per conto del Club → deve trasferirli al Club.'}
              {form.type === 'rimborso_club'      && 'Il Club ha rimborsato il founder → chiude (o riduce) il debito verso di lui.'}
              {form.type === 'trasferimento_club' && 'Il founder ha trasferito soldi al Club → chiude (o riduce) il suo debito.'}
            </p>
          </div>

          {/* Data + Importo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DATA</div>
              <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">IMPORTO (€)</div>
              <input type="number" min="0" step="0.01" className={inputCls} placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DESCRIZIONE</div>
            <input className={inputCls} placeholder="Es. Acquisto materiale evento..." value={form.description} onChange={e => set('description', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Categoria */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">CATEGORIA</div>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Note */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOTE <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionali</span></div>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Note aggiuntive..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Ricevuta — only for primary types */}
          {isPrimaryType && (
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">RICEVUTA <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#eddada] rounded-lg cursor-pointer hover:border-[#731515]/40 hover:bg-[#fdf6f6] transition-colors">
                <Upload size={13} className="text-[#7a4a4a]/50 shrink-0" />
                <span className="text-[11px] text-[#7a4a4a]/60 truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {file ? file.name : 'Seleziona file…'}
                </span>
                {file && (
                  <button type="button" onClick={e => { e.preventDefault(); setFile(null); }} className="ml-auto text-[#7a4a4a]/40 hover:text-[#731515] shrink-0">
                    <X size={11} />
                  </button>
                )}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          {error && <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors">
              {saving ? 'SALVATAGGIO…' : 'REGISTRA'}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/40 transition-colors">
              ANNULLA
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function FounderAccounts() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [filterEmail, setFilterEmail] = useState<string>('');
  const [settlingId, setSettlingId]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('founder_accounts')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) setMovements(data as Movement[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(
    payload: Omit<Movement, 'id' | 'created_by' | 'created_at' | 'settled' | 'settled_date'>
  ) {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('founder_accounts')
      .insert({ ...payload, settled: false, created_by: session?.user.id ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setMovements(prev => [data as Movement, ...prev]);
  }

  async function handleSettle(mov: Movement) {
    setSettlingId(mov.id);
    const { data, error } = await supabase
      .from('founder_accounts')
      .update({ settled: true, settled_date: localToday() })
      .eq('id', mov.id)
      .select()
      .single();
    if (!error && data) {
      setMovements(prev => prev.map(m => m.id === mov.id ? data as Movement : m));
    }
    setSettlingId(null);
  }

  /* ── Computed stats ── */
  const founderStats = useMemo(() =>
    FOUNDERS.map(f => {
      const movs     = movements.filter(m => m.founder_email === f.email);
      const balance  = founderBalance(movements, f.email);
      const spese    = movs.filter(m => m.type === 'spesa_personale'   && !m.settled).reduce((s, m) => s + m.amount, 0);
      const incassi  = movs.filter(m => m.type === 'incasso_personale' && !m.settled).reduce((s, m) => s + m.amount, 0);
      return { ...f, balance, spese, incassi, count: movs.length };
    }),
  [movements]);

  const totalClubOwes    = founderStats.filter(f => f.balance > 0).reduce((s, f) => s + f.balance, 0);
  const totalFounderOwes = founderStats.filter(f => f.balance < 0).reduce((s, f) => s + Math.abs(f.balance), 0);
  const netBalance       = totalClubOwes - totalFounderOwes;

  const displayMovs = useMemo(() =>
    movements.filter(m => !filterEmail || m.founder_email === filterEmail),
  [movements, filterEmail]);

  const founderName = (email: string) => FOUNDERS.find(f => f.email === email)?.name ?? email.split('@')[0];

  return (
    <div className="space-y-6">
      {/* Modal */}
      <AnimatePresence>
        {showAdd && <AddModal key="add" onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">FINANCE · CONTI FOUNDER</div>
          <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>Conti Founder</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 border border-[#eddada] bg-white text-[#7a4a4a] text-[10px] tracking-[0.25em] rounded-lg hover:border-[#731515]/40 transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            AGGIORNA
          </button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#731515] text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-[#9b2323] transition-colors">
            <Plus size={11} />
            REGISTRA MOVIMENTO
          </button>
        </div>
      </div>

      {/* ── Riepilogo complessivo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={15} className="text-blue-600" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">CLUB DEVE AI FOUNDER</span>
          </div>
          <div className="text-2xl font-light text-blue-600" style={{ fontFamily: 'var(--font-syne)' }}>{fmtEur(totalClubOwes)}</div>
          <div className="text-[10px] text-[#7a4a4a]/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>spese non rimborsate</div>
        </div>

        <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <TrendingDown size={15} className="text-orange-600" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">FOUNDER DEVONO AL CLUB</span>
          </div>
          <div className="text-2xl font-light text-orange-600" style={{ fontFamily: 'var(--font-syne)' }}>{fmtEur(totalFounderOwes)}</div>
          <div className="text-[10px] text-[#7a4a4a]/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>incassi non trasferiti</div>
        </div>

        <div className={`rounded-xl p-5 shadow-[0_2px_12px_rgba(107,26,26,0.12)] ${netBalance >= 0 ? 'bg-[#731515]' : 'bg-[#4a0a0a]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Wallet size={15} className="text-white/80" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-white/60">SALDO NETTO CLUB</span>
          </div>
          <div className="text-3xl font-light text-white" style={{ fontFamily: 'var(--font-syne)' }}>
            {netBalance >= 0 ? '+' : '−'}{fmtEur(netBalance)}
          </div>
          <div className="text-[10px] text-white/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            {netBalance >= 0 ? 'Club deve complessivamente ai founder' : 'Founder devono complessivamente al Club'}
          </div>
        </div>
      </div>

      {/* ── Founder cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {founderStats.map(f => {
          const owesClub    = f.balance < 0;
          const clubOwes    = f.balance > 0;
          const isEven      = f.balance === 0;
          return (
            <button
              key={f.email}
              onClick={() => setFilterEmail(filterEmail === f.email ? '' : f.email)}
              className={`bg-white border rounded-xl p-5 text-left transition-all duration-200 hover:shadow-md ${
                filterEmail === f.email ? 'border-[#731515] shadow-md' : 'border-[#eddada]'
              }`}
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${
                  owesClub ? 'bg-orange-500' : clubOwes ? 'bg-blue-600' : 'bg-[#7a4a4a]/40'
                }`} style={{ fontFamily: 'var(--font-syne)' }}>
                  {f.initials}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>{f.name}</div>
                  <div className="text-[9px] text-[#7a4a4a]/40 tracking-[0.2em]">{f.count} movimenti</div>
                </div>
              </div>

              {/* Balance */}
              <div className={`text-xl font-light mb-1 ${owesClub ? 'text-orange-600' : clubOwes ? 'text-blue-600' : 'text-[#7a4a4a]/50'}`} style={{ fontFamily: 'var(--font-syne)' }}>
                {owesClub ? '−' : clubOwes ? '+' : ''}{fmtEur(f.balance)}
              </div>
              <div className={`text-[10px] mb-3 ${owesClub ? 'text-orange-500/70' : clubOwes ? 'text-blue-500/70' : 'text-[#7a4a4a]/40'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                {owesClub ? 'Founder deve al Club' : clubOwes ? 'Club deve al founder' : 'In pari'}
              </div>

              {/* Breakdown */}
              <div className="space-y-1.5 border-t border-[#eddada] pt-3">
                {f.spese > 0 && (
                  <div className="flex items-center justify-between text-[10px]" style={{ fontFamily: 'var(--font-nunito)' }}>
                    <span className="text-[#7a4a4a]/60">Spese da rimborsare</span>
                    <span className="text-blue-600 font-medium">{fmtEur(f.spese)}</span>
                  </div>
                )}
                {f.incassi > 0 && (
                  <div className="flex items-center justify-between text-[10px]" style={{ fontFamily: 'var(--font-nunito)' }}>
                    <span className="text-[#7a4a4a]/60">Incassi da trasferire</span>
                    <span className="text-orange-600 font-medium">{fmtEur(f.incassi)}</span>
                  </div>
                )}
                {isEven && f.count === 0 && (
                  <div className="text-[10px] text-[#7a4a4a]/30 italic" style={{ fontFamily: 'var(--font-nunito)' }}>Nessun movimento</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Movimenti ── */}
      <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(107,26,26,0.04)]">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#fdf6f6] border-b border-[#eddada]">
          <div className="text-[9px] tracking-[0.4em] text-[#731515]">
            MOVIMENTI {filterEmail ? `— ${founderName(filterEmail).toUpperCase()}` : '— TUTTI'}
          </div>
          {filterEmail && (
            <button onClick={() => setFilterEmail('')} className="text-[10px] text-[#7a4a4a]/50 hover:text-[#731515] transition-colors flex items-center gap-1" style={{ fontFamily: 'var(--font-nunito)' }}>
              <X size={10} /> Rimuovi filtro
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
          </div>
        ) : displayMovs.length === 0 ? (
          <div className="text-center py-12 text-[#7a4a4a]/40 text-sm italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessun movimento registrato.
          </div>
        ) : (
          <div className="divide-y divide-[#eddada]">
            {displayMovs.map(m => {
              const cfg  = TYPE_CFG[m.type];
              const sign = cfg.amountSign === 1 ? '+' : '−';
              return (
                <div key={m.id} className={`px-5 py-4 flex flex-wrap sm:flex-nowrap items-center gap-4 transition-colors ${m.settled ? 'opacity-50 bg-[#fdf6f6]' : 'hover:bg-[#fdf6f6]/60'}`}>
                  {/* Date */}
                  <div className="w-20 shrink-0 text-[11px] text-[#7a4a4a]/60 font-mono tabular-nums">
                    {fmtDate(m.date)}
                  </div>

                  {/* Founder avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#731515]/15 flex items-center justify-center text-[10px] font-semibold text-[#731515] shrink-0" style={{ fontFamily: 'var(--font-syne)' }}>
                    {FOUNDERS.find(f => f.email === m.founder_email)?.initials ?? '?'}
                  </div>

                  {/* Description + notes */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1a0505] truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {m.description}
                    </div>
                    {m.notes && (
                      <div className="text-[10px] text-[#7a4a4a]/50 truncate mt-0.5">{m.notes}</div>
                    )}
                    {m.settled && m.settled_date && (
                      <div className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-1">
                        <Check size={10} /> Saldato il {fmtDate(m.settled_date)}
                      </div>
                    )}
                  </div>

                  {/* Type badge */}
                  <span className={`shrink-0 text-[9px] tracking-[0.15em] px-2 py-1 rounded-full border ${cfg.badgeCls}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                    {cfg.short}
                  </span>

                  {/* Amount */}
                  <div className={`shrink-0 text-sm font-semibold tabular-nums w-24 text-right ${cfg.colorCls}`} style={{ fontFamily: 'var(--font-syne)' }}>
                    {sign}{fmtEur(m.amount)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {m.receipt_url && (
                      <a href={m.receipt_url} target="_blank" rel="noopener noreferrer" title="Ricevuta" className="p-1.5 rounded-lg text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-white transition-colors">
                        <Paperclip size={12} />
                      </a>
                    )}
                    {!m.settled && (m.type === 'spesa_personale' || m.type === 'incasso_personale') && (
                      <button
                        onClick={() => handleSettle(m)}
                        disabled={settlingId === m.id}
                        title={m.type === 'spesa_personale' ? 'Segna come rimborsato' : 'Segna come trasferito'}
                        className="p-1.5 rounded-lg text-emerald-500/60 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                      >
                        <Check size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
