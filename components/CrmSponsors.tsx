'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Pencil, Trash2, RefreshCw, Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Sponsor {
  id:         string;
  name:       string;
  email:      string | null;
  phone:      string | null;
  city:       string | null;
  website:    string | null;
  notes:      string | null;
  active:     boolean;
  created_at: string;
}

type FormData = Omit<Sponsor, 'id' | 'active' | 'created_at'>;

const EMPTY_FORM: FormData = { name: '', email: '', phone: '', city: '', website: '', notes: '' };

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

/* ─────────────────────────────────────────────
   Add / Edit Modal
───────────────────────────────────────────── */
function SponsorModal({
  initial,
  onSave,
  onClose,
}: {
  initial:  FormData | null; // null = new
  onSave:   (data: FormData) => Promise<void>;
  onClose:  () => void;
}) {
  const [form,   setForm]   = useState<FormData>(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Il nome è obbligatorio.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  const isNew = initial === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eddada]">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">
              {isNew ? 'NUOVO SPONSOR' : 'MODIFICA SPONSOR'}
            </div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {isNew ? 'Aggiungi sponsor' : form.name}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOME *</div>
            <input
              className={inputCls}
              placeholder="Nome sponsor..."
              value={form.name}
              onChange={e => set('name', e.target.value)}
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">EMAIL</div>
              <input
                className={inputCls}
                placeholder="email@esempio.com"
                value={form.email ?? ''}
                onChange={e => set('email', e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TELEFONO</div>
              <input
                className={inputCls}
                placeholder="+39 ..."
                value={form.phone ?? ''}
                onChange={e => set('phone', e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
          </div>

          {/* Città + Website */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">CITTÀ</div>
              <input
                className={inputCls}
                placeholder="Milano..."
                value={form.city ?? ''}
                onChange={e => set('city', e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">SITO WEB</div>
              <input
                className={inputCls}
                placeholder="https://..."
                value={form.website ?? ''}
                onChange={e => set('website', e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOTE</div>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Note sullo sponsor..."
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

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
              {saving ? 'SALVATAGGIO…' : isNew ? 'AGGIUNGI' : 'SALVA MODIFICHE'}
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
function DeleteModal({
  sponsor,
  onConfirm,
  onClose,
}: {
  sponsor:   Sponsor;
  onConfirm: () => Promise<void>;
  onClose:   () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onConfirm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
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
            Elimina sponsor
          </h3>
          <p className="text-sm text-[#7a4a4a]/70 mb-6" style={{ fontFamily: 'var(--font-nunito)' }}>
            Sei sicuro di voler eliminare <strong>{sponsor.name}</strong>? L&apos;operazione è irreversibile.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
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
   Main component
───────────────────────────────────────────── */
export default function CrmSponsors() {
  const [sponsors,    setSponsors]    = useState<Sponsor[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [addModal,    setAddModal]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<Sponsor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSponsors(data as Sponsor[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  /* ── CRUD ── */
  async function handleAdd(form: FormData) {
    const payload = {
      name:    form.name.trim(),
      email:   form.email?.trim()   || null,
      phone:   form.phone?.trim()   || null,
      city:    form.city?.trim()    || null,
      website: form.website?.trim() || null,
      notes:   form.notes?.trim()   || null,
    };
    const { data, error } = await supabase.from('sponsors').insert(payload).select().single();
    if (error) throw new Error(error.message);
    setSponsors(prev => [data as Sponsor, ...prev]);
  }

  async function handleEdit(form: FormData) {
    if (!editTarget) return;
    const payload = {
      name:    form.name.trim(),
      email:   form.email?.trim()   || null,
      phone:   form.phone?.trim()   || null,
      city:    form.city?.trim()    || null,
      website: form.website?.trim() || null,
      notes:   form.notes?.trim()   || null,
    };
    const { data, error } = await supabase
      .from('sponsors').update(payload).eq('id', editTarget.id).select().single();
    if (error) throw new Error(error.message);
    setSponsors(prev => prev.map(s => s.id === editTarget.id ? data as Sponsor : s));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('sponsors').delete().eq('id', deleteTarget.id);
    if (error) throw new Error(error.message);
    setSponsors(prev => prev.filter(s => s.id !== deleteTarget.id));
  }

  /* ── Derived ── */
  const filtered = sponsors.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.email  ?? '').toLowerCase().includes(q) ||
      (s.city   ?? '').toLowerCase().includes(q) ||
      (s.website ?? '').toLowerCase().includes(q)
    );
  });

  const activeCount = sponsors.filter(s => s.active).length;

  return (
    <div>
      {/* Modals */}
      <AnimatePresence>
        {addModal && (
          <SponsorModal key="add" initial={null} onSave={handleAdd} onClose={() => setAddModal(false)} />
        )}
        {editTarget && (
          <SponsorModal
            key="edit"
            initial={{ name: editTarget.name, email: editTarget.email, phone: editTarget.phone, city: editTarget.city, website: editTarget.website, notes: editTarget.notes }}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
        {deleteTarget && (
          <DeleteModal key="delete" sponsor={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">ADMIN</div>
          <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
            CRM Sponsors
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
            AGGIUNGI SPONSOR
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Sponsors totali', value: sponsors.length,  color: 'text-[#731515]'   },
          { label: 'Attivi',          value: activeCount,       color: 'text-emerald-600' },
          { label: 'Inattivi',        value: sponsors.length - activeCount, color: 'text-[#7a4a4a]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-[#eddada] rounded-xl p-4 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={13} className={color} />
              <span className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/60">{label.toUpperCase()}</span>
            </div>
            <div className={`text-2xl font-light ${color}`} style={{ fontFamily: 'var(--font-syne)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a4a4a]/40" />
        <input
          className={`${inputCls} pl-9`}
          placeholder="Cerca per nome, email o città…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ fontFamily: 'var(--font-nunito)' }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-16 text-[#7a4a4a]/50 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
          <Building2 size={32} className="mx-auto mb-3 text-[#eddada]" />
          Nessuno sponsor ancora. Aggiungi il primo sponsor con il pulsante in alto.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#7a4a4a]/50 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
          Nessun risultato per &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <div className="bg-white border border-[#eddada] rounded-xl shadow-[0_1px_4px_rgba(107,26,26,0.04)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_2fr_auto] gap-4 px-4 py-2.5 border-b border-[#eddada] bg-[#fdf6f6]">
            {['NOME','EMAIL','TELEFONO','CITTÀ','SITO WEB',''].map((h, i) => (
              <div key={i} className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#eddada]">
            {filtered.map(sponsor => (
              <div
                key={sponsor.id}
                className="grid grid-cols-[2fr_2fr_1fr_1fr_2fr_auto] gap-4 items-center px-4 py-3 bg-white hover:bg-[#fdf6f6] transition-colors"
              >
                {/* Nome + data aggiunta */}
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#1a0505] truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {sponsor.name}
                  </div>
                  <div className="text-[10px] text-[#7a4a4a]/45 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {fmtDate(sponsor.created_at)}
                  </div>
                </div>

                {/* Email */}
                <div className="text-[12px] text-[#7a4a4a]/70 truncate min-w-0" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {sponsor.email || <span className="text-[#7a4a4a]/30">—</span>}
                </div>

                {/* Telefono */}
                <div className="text-[12px] text-[#7a4a4a]/70 truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {sponsor.phone || <span className="text-[#7a4a4a]/30">—</span>}
                </div>

                {/* Città */}
                <div className="text-[12px] text-[#7a4a4a]/70 truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {sponsor.city || <span className="text-[#7a4a4a]/30">—</span>}
                </div>

                {/* Sito web */}
                <div className="min-w-0">
                  {sponsor.website ? (
                    <a
                      href={sponsor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-[#731515] hover:underline truncate block"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {sponsor.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-[12px] text-[#7a4a4a]/30">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditTarget(sponsor)}
                    title="Modifica"
                    className="p-2 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(sponsor)}
                    title="Elimina"
                    className="p-2 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fde8e8] transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes column — shown inline in an expand if present */}
      {filtered.some(s => s.notes) && (
        <p className="mt-3 text-[10px] text-[#7a4a4a]/40 text-right" style={{ fontFamily: 'var(--font-nunito)' }}>
          Le note sono visibili modificando lo sponsor.
        </p>
      )}
    </div>
  );
}
