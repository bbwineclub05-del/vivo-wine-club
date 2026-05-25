'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff,
  Tag, ImagePlus, CheckCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Discount {
  id:          string;
  title:       string;
  description: string | null;
  logo_url:    string | null;
  code:        string | null;
  partner:     string | null;
  expires_at:  string | null;
  visible:     boolean;
  sort_order:  number;
  created_at:  string;
}

// ── Shared input styles ────────────────────────────────────────────────────────
const inp = 'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3.5 py-2.5 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

// ── Image uploader (single image, folder=discounts) ───────────────────────────

function DiscountImageUploader({
  url,
  onChange,
  token,
}: {
  url:      string | null;
  onChange: (url: string | null) => void;
  token:    string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('file', files[0]);
      fd.append('folder', 'discounts');
      const res  = await fetch('/api/media/upload', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setUploadErr(data.error ?? 'Errore upload immagine');
        return;
      }
      onChange(data.url);
    } catch {
      setUploadErr('Errore di rete durante l\'upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">LOGO / IMMAGINE</label>
      {url && (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#eddada] mb-3 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-[10px] tracking-[0.25em] border border-dashed border-[#eddada] text-[#7a4a4a]/60 hover:border-[#731515]/40 hover:text-[#731515]/60 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 w-full justify-center"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
        {uploading ? 'UPLOAD IN CORSO…' : url ? 'CAMBIA IMMAGINE' : 'CARICA LOGO'}
      </button>
      <input
        ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { setUploadErr(''); handleFile(e.target.files); }}
      />
      {uploadErr && (
        <p className="text-[10px] text-[#731515] mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>{uploadErr}</p>
      )}
    </div>
  );
}

// ── Discount Modal ─────────────────────────────────────────────────────────────

interface ModalState {
  mode:     'create' | 'edit';
  discount: Partial<Discount>;
}

function DiscountModal({
  state,
  token,
  onClose,
  onSaved,
}: {
  state:   ModalState;
  token:   string;
  onClose: () => void;
  onSaved: (d: Discount) => void;
}) {
  const isEdit = state.mode === 'edit';
  const [form, setForm] = useState<Partial<Discount>>({
    title:       '',
    description: '',
    logo_url:    null,
    code:        '',
    partner:     '',
    expires_at:  null,
    visible:     true,
    sort_order:  0,
    ...state.discount,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  function set<K extends keyof Discount>(key: K, val: Discount[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim()) { setErr('Il titolo è obbligatorio'); return; }
    setSaving(true);
    setErr('');
    try {
      const url    = isEdit ? `/api/discounts/${state.discount.id}` : '/api/discounts';
      const method = isEdit ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:       form.title?.trim(),
          description: form.description?.trim() || null,
          logo_url:    form.logo_url || null,
          code:        form.code?.trim() || null,
          partner:     form.partner?.trim() || null,
          expires_at:  form.expires_at || null,
          visible:     form.visible ?? true,
          sort_order:  Number(form.sort_order) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Errore salvataggio'); return; }
      onSaved(data.discount);
    } catch {
      setErr('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{ opacity: 0,    y: 8,  scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[#eddada]/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#eddada]">
          <div>
            <h2
              className="text-[16px] font-light text-[#1a0505]"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {isEdit ? 'Modifica Sconto' : 'Nuovo Sconto'}
            </h2>
            <p className="text-[10px] text-[#7a4a4a]/50 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
              {isEdit ? 'Aggiorna i dettagli dello sconto' : 'Aggiungi un nuovo sconto per i membri'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#7a4a4a]/40 hover:text-[#7a4a4a]/80 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">TITOLO *</label>
            <input
              className={inp}
              value={form.title ?? ''}
              onChange={e => set('title', e.target.value)}
              placeholder="es. 20% di sconto su…"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

          {/* Partner */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">PARTNER</label>
            <input
              className={inp}
              value={form.partner ?? ''}
              onChange={e => set('partner', e.target.value)}
              placeholder="es. Vineria Rossi"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">DESCRIZIONE</label>
            <textarea
              className={`${inp} resize-none`}
              rows={3}
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Descrivi il vantaggio per i membri…"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">CODICE SCONTO</label>
            <input
              className={`${inp} font-mono`}
              value={form.code ?? ''}
              onChange={e => set('code', e.target.value)}
              placeholder="es. VIVO20"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>

          {/* Expires at + Sort order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">SCADENZA</label>
              <input
                type="date"
                className={inp}
                value={form.expires_at ?? ''}
                onChange={e => set('expires_at', e.target.value || null)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">ORDINE</label>
              <input
                type="number"
                className={inp}
                value={form.sort_order ?? 0}
                onChange={e => set('sort_order', Number(e.target.value))}
                min={0}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
          </div>

          {/* Logo uploader */}
          <DiscountImageUploader
            url={form.logo_url ?? null}
            onChange={url => set('logo_url', url)}
            token={token}
          />

          {/* Visible toggle */}
          <div className="flex items-center justify-between bg-[#fdf6f6] border border-[#eddada] rounded-lg px-4 py-3">
            <span className="text-[12px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Visibile ai membri
            </span>
            <button
              type="button"
              onClick={() => set('visible', !form.visible)}
              className={`w-9 h-5 rounded-full transition-colors relative ${form.visible ? 'bg-[#731515]' : 'bg-[#eddada]'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.visible ? 'left-[18px]' : 'left-0.5'}`}
              />
            </button>
          </div>

          {err && (
            <p className="text-[12px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{err}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.25em] hover:bg-[#fdf6f6] transition-colors rounded-lg"
            >
              ANNULLA
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.25em] hover:bg-[#9b2323] disabled:opacity-55 disabled:cursor-not-allowed transition-colors rounded-lg flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              {saving ? 'SALVATAGGIO…' : isEdit ? 'AGGIORNA' : 'CREA SCONTO'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Discount Card ──────────────────────────────────────────────────────────────

function DiscountCard({
  discount,
  token,
  onEdit,
  onDeleted,
  onToggleVisible,
}: {
  discount:        Discount;
  token:           string;
  onEdit:          () => void;
  onDeleted:       () => void;
  onToggleVisible: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/discounts/${discount.id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  const expiryStr = discount.expires_at
    ? new Date(discount.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div
      className={`bg-white border border-[#eddada] rounded-xl p-4 shadow-[0_1px_4px_rgba(107,26,26,0.06)] flex flex-col gap-3 ${!discount.visible ? 'opacity-55' : ''}`}
    >
      {/* Top: logo + title/partner */}
      <div className="flex items-start gap-3">
        {discount.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={discount.logo_url}
            alt={discount.partner ?? discount.title}
            className="w-10 h-10 rounded-lg object-cover border border-[#eddada] shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#fdf6f6] border border-[#eddada] flex items-center justify-center shrink-0">
            <Tag size={16} className="text-[#731515]/40" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {discount.partner && (
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-0.5 truncate uppercase">{discount.partner}</div>
          )}
          <div className="text-[13px] font-light text-[#1a0505] leading-snug" style={{ fontFamily: 'var(--font-syne)' }}>
            {discount.title}
          </div>
        </div>
      </div>

      {/* Description */}
      {discount.description && (
        <p className="text-[11px] text-[#7a4a4a]/70 font-light leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
          {discount.description}
        </p>
      )}

      {/* Code chip */}
      {discount.code && (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#f8f0f0] border border-[#eddada] text-[#731515] text-[11px] font-mono rounded-md">
            {discount.code}
          </span>
        </div>
      )}

      {/* Expiry */}
      {expiryStr && (
        <p className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          Scade il {expiryStr}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#eddada] mt-auto">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-[#7a4a4a]/60 hover:text-[#731515] transition-colors px-2.5 py-1.5 rounded-md hover:bg-[#fdf6f6]"
        >
          <Pencil size={11} />
          MODIFICA
        </button>
        <button
          onClick={onToggleVisible}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-[#7a4a4a]/60 hover:text-[#731515] transition-colors px-2.5 py-1.5 rounded-md hover:bg-[#fdf6f6]"
          title={discount.visible ? 'Nascondi' : 'Mostra'}
        >
          {discount.visible ? <EyeOff size={11} /> : <Eye size={11} />}
          {discount.visible ? 'NASCONDI' : 'MOSTRA'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`ml-auto flex items-center gap-1.5 text-[10px] tracking-[0.2em] transition-colors px-2.5 py-1.5 rounded-md ${
            confirmDelete
              ? 'text-white bg-[#731515] hover:bg-[#9b2323]'
              : 'text-[#7a4a4a]/60 hover:text-[#731515] hover:bg-[#fdf6f6]'
          }`}
        >
          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          {confirmDelete ? 'CONFERMA' : 'ELIMINA'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DiscountManager({ token }: { token: string }) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [modal,     setModal]     = useState<ModalState | null>(null);

  async function loadDiscounts() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/discounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Errore caricamento'); return; }
      setDiscounts(data.discounts ?? []);
    } catch {
      setError('Errore di rete');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openCreate() {
    setModal({ mode: 'create', discount: {} });
  }

  function openEdit(d: Discount) {
    setModal({ mode: 'edit', discount: d });
  }

  function handleSaved(d: Discount) {
    setDiscounts(prev => {
      const idx = prev.findIndex(x => x.id === d.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = d;
        return next;
      }
      return [d, ...prev];
    });
    setModal(null);
  }

  function handleDeleted(id: string) {
    setDiscounts(prev => prev.filter(d => d.id !== id));
  }

  async function toggleVisible(d: Discount) {
    const res  = await fetch(`/api/discounts/${d.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ visible: !d.visible }),
    });
    if (res.ok) {
      const data = await res.json();
      setDiscounts(prev => prev.map(x => x.id === d.id ? data.discount : x));
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-[15px] font-light text-[#1a0505]"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Gestione Sconti
          </h2>
          <p className="text-[11px] text-[#7a4a4a]/60 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {discounts.length} {discounts.length === 1 ? 'sconto' : 'sconti'} configurati
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#731515] text-white text-[10px] tracking-[0.25em] px-4 py-2.5 rounded-lg hover:bg-[#9b2323] transition-colors"
        >
          <Plus size={13} />
          NUOVO SCONTO
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#731515]/8 border border-[#731515]/20 text-[#731515] text-sm px-4 py-3 rounded-lg mb-5">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin text-[#731515]/40" />
        </div>
      ) : discounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fdf6f6] border border-[#eddada] flex items-center justify-center mb-4">
            <Tag size={22} className="text-[#731515]/30" strokeWidth={1.5} />
          </div>
          <p className="text-[9px] tracking-[0.5em] text-[#7a4a4a]/40 uppercase mb-2">Nessuno sconto</p>
          <p className="text-sm text-[#7a4a4a]/50 font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
            Crea il primo sconto cliccando "+ NUOVO SCONTO"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map(d => (
            <DiscountCard
              key={d.id}
              discount={d}
              token={token}
              onEdit={() => openEdit(d)}
              onDeleted={() => handleDeleted(d.id)}
              onToggleVisible={() => toggleVisible(d)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <DiscountModal
            state={modal}
            token={token}
            onClose={() => setModal(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
