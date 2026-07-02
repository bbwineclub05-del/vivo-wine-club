'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Upload, Paperclip,
  RefreshCw, TrendingUp, TrendingDown, Wallet, Trash2, Pencil,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types for dynamic member list
───────────────────────────────────────────── */
interface TeamMember { name: string; email: string; initials: string; }

const CATEGORIES = ['Evento', 'Membership', 'Marketing', 'Operativo', 'Merch', 'Altro'];

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
// Only 2 types are user-facing; rimborso_club / trasferimento_club exist in DB for legacy
type MovType = 'spesa_personale' | 'incasso_personale' | 'rimborso_club' | 'trasferimento_club';
type UserMovType = 'spesa_personale' | 'incasso_personale';

interface Movement {
  id:            string;
  date:          string;
  founder_email: string;
  type:          MovType;
  description:   string;
  amount:        number;
  category:      string | null;
  receipt_url:   string | null;
  settled:        boolean;
  settled_date:   string | null;
  notes:          string | null;
  transaction_id: string | null;
  created_by:     string | null;
  created_at:     string;
}

/* ─────────────────────────────────────────────
   Type config
   amountSign: how entry affects Club's debt to founder
     +1 → Club owes founder more  (spesa)
     -1 → founder owes Club more  (incasso)
───────────────────────────────────────────── */
const TYPE_CFG: Record<MovType, {
  label:      string;
  sublabel:   string;
  short:      string;
  badgeCls:   string;
  amountSign: 1 | -1;
  colorCls:   string;
}> = {
  spesa_personale:    {
    label:      'Ha pagato per il Club',
    sublabel:   'Il membro ha anticipato una spesa — il Club gli deve rimborsare',
    short:      'SPESA',
    badgeCls:   'bg-blue-50 text-blue-700 border-blue-200',
    amountSign:  1,
    colorCls:   'text-blue-600',
  },
  incasso_personale:  {
    label:      'Ha incassato per il Club',
    sublabel:   'Il membro ha ricevuto soldi per il Club — deve trasferirli',
    short:      'INCASSO',
    badgeCls:   'bg-orange-50 text-orange-700 border-orange-200',
    amountSign: -1,
    colorCls:   'text-orange-600',
  },
  rimborso_club:      {
    label:      'Rimborso dal Club',
    sublabel:   '',
    short:      'RIMBORSO',
    badgeCls:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    amountSign: -1,
    colorCls:   'text-emerald-600',
  },
  trasferimento_club: {
    label:      'Trasferimento al Club',
    sublabel:   '',
    short:      'TRASFERI.',
    badgeCls:   'bg-purple-50 text-purple-700 border-purple-200',
    amountSign:  1,
    colorCls:   'text-purple-600',
  },
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
function memberName(email: string, members: TeamMember[]) {
  return members.find(m => m.email === email)?.name ?? email.split('@')[0];
}

const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-sm ' +
  'placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

/* ─────────────────────────────────────────────
   Movement Form Modal (Add + Edit)
───────────────────────────────────────────── */
interface FormState {
  founder_email: string;
  type:          UserMovType;
  date:          string;
  description:   string;
  amount:        string;
  category:      string;
  notes:         string;
}

function MovModal({
  initial,
  onSave,
  onClose,
  members,
}: {
  initial:  Partial<FormState> | null;
  onSave:   (data: Omit<Movement, 'id' | 'created_by' | 'created_at' | 'settled' | 'settled_date'>) => Promise<void>;
  onClose:  () => void;
  members:  TeamMember[];
}) {
  const [form, setForm] = useState<FormState>({
    founder_email: initial?.founder_email ?? members[0]?.email ?? '',
    type:          (initial?.type as UserMovType) ?? 'spesa_personale',
    date:          initial?.date ?? localToday(),
    description:   initial?.description ?? '',
    amount:        initial?.amount ?? '',
    category:      initial?.category ?? 'Evento',
    notes:         initial?.notes ?? '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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
        date:           form.date,
        founder_email:  form.founder_email,
        type:           form.type,
        description:    form.description.trim(),
        amount:         amt,
        category:       form.category || null,
        notes:          form.notes.trim() || null,
        receipt_url,
        transaction_id: null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = initial !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
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
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">CONTI MEMBER</div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {isEdit ? 'Modifica movimento' : 'Registra movimento'}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[#7a4a4a]/50 hover:text-[#731515] transition-colors rounded-lg"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        <div className="px-6 py-5 space-y-4">
          {/* Member */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">MEMBER</div>
            <select
              className={inputCls}
              value={form.founder_email}
              onChange={e => set('founder_email', e.target.value)}
              style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
            >
              <option value="">— Seleziona membro —</option>
              {members.map(m => (
                <option key={m.email} value={m.email}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TIPO</div>
            <div className="grid grid-cols-2 gap-2">
              {(['spesa_personale', 'incasso_personale'] as UserMovType[]).map(t => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`py-3 px-3 rounded-lg text-left text-[11px] font-medium transition-all border ${
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
              {TYPE_CFG[form.type].sublabel}
            </p>
          </div>

          {/* Data + Importo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DATA</div>
              <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }} />
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">IMPORTO (€)</div>
              <input type="number" min="0" step="0.01" className={inputCls} placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }} />
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DESCRIZIONE</div>
            <input className={inputCls} placeholder="Es. Acquisto materiale evento..." value={form.description} onChange={e => set('description', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }} />
          </div>

          {/* Categoria */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">CATEGORIA</div>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Note */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOTE <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionali</span></div>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Note aggiuntive..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }} />
          </div>

          {/* Ricevuta */}
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

          {error && <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors">
              {saving ? 'SALVATAGGIO…' : isEdit ? 'SALVA MODIFICHE' : 'REGISTRA'}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/40 transition-colors">
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
function DeleteModal({ mov, onConfirm, onClose }: { mov: Movement; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={15} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>Elimina movimento</h3>
            <p className="text-[11px] text-[#7a4a4a]/60 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>Questa azione è irreversibile.</p>
          </div>
        </div>
        <p className="text-[12px] text-[#7a4a4a] mb-5 bg-[#fdf6f6] rounded-lg px-3 py-2 border border-[#eddada]" style={{ fontFamily: 'var(--font-nunito)' }}>
          <span className="font-semibold text-[#1a0505]">{mov.description}</span>
          <br />
          <span className="text-[#7a4a4a]/60">{fmtDate(mov.date)} · {fmtEur(mov.amount)}</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => { setDeleting(true); await onConfirm(); }}
            disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'ELIMINAZIONE…' : 'ELIMINA'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.25em] rounded-lg hover:border-[#731515]/40 transition-colors">
            ANNULLA
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function FounderAccounts() {
  const [movements,    setMovements]    = useState<Movement[]>([]);
  const [members,      setMembers]      = useState<TeamMember[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [editTarget,   setEditTarget]   = useState<Movement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Movement | null>(null);
  const [filterEmail,  setFilterEmail]  = useState<string>('');
  const [settlingId,   setSettlingId]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('founder_accounts')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      console.error('[FounderAccounts] fetch error:', error);
    } else {
      console.log('[FounderAccounts] loaded', data?.length ?? 0, 'movements:', data);
      setMovements((data ?? []) as Movement[]);
    }
    setLoading(false);
  }

  /* Realtime: aggiorna la lista ogni volta che founder_accounts cambia
     (incluse le insert fatte da FinanceManager con assigned_to != Club) */
  useEffect(() => {
    // Fetch team members dynamically
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token ?? '';
      if (token) {
        fetch('/api/team/members', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => { if (d.members) setMembers(d.members as TeamMember[]); })
          .catch(() => {});
      }
    });
    load();
    const channel = supabase
      .channel('founder_accounts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'founder_accounts' },
        (payload) => {
          console.log('[FounderAccounts] realtime event:', payload.eventType, payload);
          load();
        },
      )
      .subscribe((status) => {
        console.log('[FounderAccounts] realtime status:', status);
      });
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Edit ── */
  async function handleEdit(payload: Omit<Movement, 'id' | 'created_by' | 'created_at' | 'settled' | 'settled_date'>) {
    if (!editTarget) return;
    const { data, error } = await supabase
      .from('founder_accounts')
      .update(payload)
      .eq('id', editTarget.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setMovements(prev => prev.map(m => m.id === editTarget.id ? data as Movement : m));
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('founder_accounts').delete().eq('id', deleteTarget.id);
    if (error) throw new Error(error.message);
    setMovements(prev => prev.filter(m => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  /* ── Settle ── */
  async function handleSettle(mov: Movement) {
    setSettlingId(mov.id);
    const today = localToday();

    const { data, error } = await supabase
      .from('founder_accounts')
      .update({ settled: true, settled_date: today })
      .eq('id', mov.id)
      .select()
      .single();

    if (error) {
      console.error('[FounderAccounts] settle error:', error);
    } else if (data) {
      console.log('[FounderAccounts] settled movement:', data);
      setMovements(prev => prev.map(m => m.id === mov.id ? data as Movement : m));
    }

    setSettlingId(null);
  }

  /* ── Computed stats (only unsettled movements) ── */
  const founderStats = useMemo(() => {
    return members.map(f => {
      const open    = movements.filter(m => m.founder_email === f.email && !m.settled);
      const balance = open.reduce((sum, m) => {
        const sign = TYPE_CFG[m.type]?.amountSign ?? 0;
        return sum + m.amount * sign;
      }, 0);
      return { ...f, balance, openCount: open.length };
    });
  }, [movements, members]);

  const totalClubOwes    = founderStats.filter(f => f.balance > 0).reduce((s, f) => s + f.balance, 0);
  const totalFounderOwes = founderStats.filter(f => f.balance < 0).reduce((s, f) => s + Math.abs(f.balance), 0);
  const netBalance       = totalClubOwes - totalFounderOwes;

  const displayMovs = useMemo(() =>
    movements.filter(m => !filterEmail || m.founder_email === filterEmail),
  [movements, filterEmail]);

  return (
    <div className="space-y-6">
      {/* Modals */}
      <AnimatePresence>
        {editTarget && (
          <MovModal
            key="edit"
            initial={{
              founder_email: editTarget.founder_email,
              type:          editTarget.type as UserMovType,
              date:          editTarget.date,
              description:   editTarget.description,
              amount:        String(editTarget.amount),
              category:      editTarget.category ?? 'Evento',
              notes:         editTarget.notes ?? '',
            }}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
            members={members}
          />
        )}
        {deleteTarget && (
          <DeleteModal key="del" mov={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">FINANCE · CONTI MEMBER</div>
          <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>Conti Member</h2>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 border border-[#eddada] bg-white text-[#7a4a4a] text-[10px] tracking-[0.25em] rounded-lg hover:border-[#731515]/40 transition-colors disabled:opacity-50">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          AGGIORNA
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={15} className="text-blue-600" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">CLUB DEVE AI MEMBER</span>
          </div>
          <div className="text-2xl font-light text-blue-600" style={{ fontFamily: 'var(--font-syne)' }}>{fmtEur(totalClubOwes)}</div>
          <div className="text-[10px] text-[#7a4a4a]/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>spese non rimborsate</div>
        </div>

        <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <TrendingDown size={15} className="text-orange-600" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">MEMBER DEVONO AL CLUB</span>
          </div>
          <div className="text-2xl font-light text-orange-600" style={{ fontFamily: 'var(--font-syne)' }}>{fmtEur(totalFounderOwes)}</div>
          <div className="text-[10px] text-[#7a4a4a]/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>incassi non trasferiti</div>
        </div>

        <div className={`rounded-xl p-5 shadow-[0_2px_12px_rgba(107,26,26,0.12)] ${netBalance >= 0 ? 'bg-[#731515]' : 'bg-[#4a0a0a]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Wallet size={15} className="text-white/80" />
            </div>
            <span className="text-[9px] tracking-[0.35em] text-white/60">SALDO NETTO APERTO</span>
          </div>
          <div className="text-3xl font-light text-white" style={{ fontFamily: 'var(--font-syne)' }}>
            {netBalance >= 0 ? '+' : '−'}{fmtEur(netBalance)}
          </div>
          <div className="text-[10px] text-white/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            {netBalance >= 0 ? 'Club deve complessivamente ai member' : 'Member devono al Club'}
          </div>
        </div>
      </div>

      {/* ── Member cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {founderStats.map(f => {
          const owesClub = f.balance < 0;
          const clubOwes = f.balance > 0;
          const isActive = filterEmail === f.email;
          return (
            <button
              key={f.email}
              onClick={() => setFilterEmail(isActive ? '' : f.email)}
              className={`bg-white border rounded-xl p-5 text-left transition-all duration-200 hover:shadow-md ${
                isActive ? 'border-[#731515] shadow-md' : 'border-[#eddada]'
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
                  <div className={`text-[9px] tracking-[0.2em] ${f.openCount > 0 ? 'text-[#731515]' : 'text-[#7a4a4a]/40'}`}>
                    {f.openCount} {f.openCount === 1 ? 'operazione aperta' : 'operazioni aperte'}
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className={`text-xl font-light ${owesClub ? 'text-orange-600' : clubOwes ? 'text-blue-600' : 'text-[#7a4a4a]/40'}`} style={{ fontFamily: 'var(--font-syne)' }}>
                {owesClub ? '−' : clubOwes ? '+' : ''}{fmtEur(f.balance)}
              </div>
              <div className={`text-[10px] mt-0.5 ${owesClub ? 'text-orange-500/70' : clubOwes ? 'text-blue-500/70' : 'text-[#7a4a4a]/40'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                {owesClub ? 'Membro deve al Club' : clubOwes ? 'Club deve al membro' : 'In pari'}
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
            STORICO {filterEmail ? `— ${memberName(filterEmail, members).toUpperCase()}` : '— TUTTI'}
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
                <div key={m.id} className={`px-5 py-4 flex flex-wrap sm:flex-nowrap items-center gap-3 transition-colors ${m.settled ? 'bg-[#fdf6f6]/60' : 'hover:bg-[#fdf6f6]/60'}`}>
                  {/* Date */}
                  <div className="w-20 shrink-0 text-[11px] text-[#7a4a4a]/60 font-mono tabular-nums">
                    {fmtDate(m.date)}
                  </div>

                  {/* Member avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#731515]/15 flex items-center justify-center text-[10px] font-semibold text-[#731515] shrink-0" style={{ fontFamily: 'var(--font-syne)' }}>
                    {members.find(f => f.email === m.founder_email)?.initials ?? '?'}
                  </div>

                  {/* Description + notes */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-medium truncate ${m.settled ? 'text-[#7a4a4a]/50' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                      {m.description}
                    </div>
                    {m.notes && (
                      <div className="text-[10px] text-[#7a4a4a]/40 truncate mt-0.5">{m.notes}</div>
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
                  <div className={`shrink-0 text-sm font-semibold tabular-nums w-24 text-right ${m.settled ? 'text-[#7a4a4a]/40' : cfg.colorCls}`} style={{ fontFamily: 'var(--font-syne)' }}>
                    {sign}{fmtEur(m.amount)}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0 w-20 flex justify-center">
                    {m.settled ? (
                      <span className="text-[9px] tracking-[0.1em] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ fontFamily: 'var(--font-nunito)' }}>
                        SALDATO
                      </span>
                    ) : (
                      <span className="text-[9px] tracking-[0.1em] px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200" style={{ fontFamily: 'var(--font-nunito)' }}>
                        APERTO
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {m.receipt_url && (
                      <a href={m.receipt_url} target="_blank" rel="noopener noreferrer" title="Ricevuta"
                        className="p-1.5 rounded-lg text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors">
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
                    {!m.settled && (
                      <button
                        onClick={() => setEditTarget(m)}
                        title="Modifica"
                        className="p-1.5 rounded-lg text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(m)}
                      title="Elimina"
                      className="p-1.5 rounded-lg text-[#7a4a4a]/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
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
