'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Trash2, Download,
  Loader2, FolderOpen, Plus, X, CheckCircle2,
} from 'lucide-react';

/* ── Types ── */
interface Document {
  id:          string;
  title:       string;
  description: string | null;
  category:    string;
  file_name:   string;
  file_size:   number | null;
  uploaded_by: string;
  created_at:  string;
}

/* ── Constants ── */
const CATEGORIES = ['Pitch', 'Statuto', 'Preventivi', 'Contratti', 'Verbali', 'Altro'];

const CATEGORY_COLORS: Record<string, string> = {
  Pitch:      'bg-blue-50 text-blue-700 border-blue-200',
  Statuto:    'bg-purple-50 text-purple-700 border-purple-200',
  Preventivi: 'bg-amber-50 text-amber-700 border-amber-200',
  Contratti:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Verbali:    'bg-slate-50 text-slate-600 border-slate-200',
  Altro:      'bg-[#fdf6f6] text-[#731515] border-[#eddada]',
};

/* ── Helpers ── */
function fmtSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Altro;
  return (
    <span className={`inline-block text-[8px] tracking-[0.2em] px-2 py-0.5 border rounded-full whitespace-nowrap ${cls}`}>
      {category.toUpperCase()}
    </span>
  );
}

/* ── Main component ── */
export default function DocumentManager({
  token,
  isAdmin,
}: {
  token:   string;
  isAdmin: boolean;
}) {
  const [docs,        setDocs]        = useState<Document[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadOk,    setUploadOk]    = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  /* form state */
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('Altro');
  const [file,        setFile]        = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error ?? 'Errore nel caricamento.');
      else setDocs(data.documents ?? []);
    } catch {
      setError('Errore di rete.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  /* ── Reset form ── */
  function resetForm() {
    setTitle(''); setDescription(''); setCategory('Altro'); setFile(null);
    setUploadError(''); setUploadOk(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  /* ── Upload ── */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setUploadError('Seleziona un file PDF.'); return; }
    setUploadError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file',        file);
      fd.append('title',       title);
      fd.append('description', description);
      fd.append('category',    category);

      const res  = await fetch('/api/documents', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();

      if (!res.ok || data.error) { setUploadError(data.error ?? 'Errore upload.'); return; }

      setUploadOk(true);
      resetForm();
      setTimeout(() => { setShowForm(false); setUploadOk(false); }, 1400);
      load();
    } catch {
      setUploadError('Errore di rete.');
    } finally {
      setUploading(false);
    }
  }

  /* ── Delete ── */
  async function handleDelete(doc: Document) {
    if (!confirm(`Eliminare "${doc.title}"? L'operazione non è reversibile.`)) return;
    setDeleting(doc.id);
    try {
      await fetch(`/api/documents/${doc.id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } finally {
      setDeleting(null);
    }
  }

  /* ── Download ── */
  async function handleDownload(doc: Document) {
    setDownloading(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { console.error('[download] failed'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  /* ── Styles ── */
  const inputCls =
    'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2.5 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 rounded-lg';

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header + upload button ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1
            className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-[#1a0505] leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Gestione Documenti
          </h1>
          <p
            className="mt-2 text-sm text-[#7a4a4a]/70 font-light"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Archivia e condividi documenti interni con il team.
          </p>
          <div className="mt-5 h-px w-16 bg-[#731515]/30" />
        </div>
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }}
          className="shrink-0 flex items-center gap-2 text-[10px] tracking-[0.25em] px-4 py-2.5 bg-[#731515] text-white rounded-lg hover:bg-[#9b2323] transition-colors duration-200 self-start"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? 'ANNULLA' : 'CARICA DOCUMENTO'}
        </button>
      </div>

      {/* ── Upload form (collapsible) ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-[#eddada] rounded-xl p-6 shadow-[0_1px_4px_rgba(107,26,26,0.06),0_6px_20px_rgba(107,26,26,0.04)]">
              <div className="flex items-center gap-2 mb-5">
                <Upload size={13} className="text-[#731515]" />
                <span className="text-[9px] tracking-[0.42em] text-[#731515] uppercase">
                  Carica nuovo documento
                </span>
              </div>

              {uploadOk ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-lg"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  <CheckCircle2 size={14} />
                  Documento caricato con successo.
                </motion.div>
              ) : (
                <form onSubmit={handleUpload} className="flex flex-col gap-4">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">
                        TITOLO *
                      </label>
                      <input
                        type="text" required
                        value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="Es. Pitch Deck 2026"
                        className={inputCls} style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">
                        CATEGORIA
                      </label>
                      <div className="relative">
                        <select
                          value={category} onChange={e => setCategory(e.target.value)}
                          className={`${inputCls} appearance-none cursor-pointer`}
                          style={{ fontFamily: 'var(--font-nunito)' }}
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                            <path d="M1 1l4 4 4-4" stroke="#731515" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">
                      DESCRIZIONE
                    </label>
                    <input
                      type="text"
                      value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Descrizione opzionale"
                      className={inputCls} style={{ fontFamily: 'var(--font-nunito)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">
                      FILE PDF *
                    </label>
                    <div
                      className="border-2 border-dashed border-[#eddada] rounded-lg p-6 text-center cursor-pointer hover:border-[#731515]/40 transition-colors duration-200"
                      onClick={() => fileRef.current?.click()}
                    >
                      <input
                        ref={fileRef}
                        type="file" accept="application/pdf" className="hidden"
                        onChange={e => setFile(e.target.files?.[0] ?? null)}
                      />
                      {file ? (
                        <div
                          className="flex items-center justify-center gap-2 text-sm text-[#1a0505]"
                          style={{ fontFamily: 'var(--font-nunito)' }}
                        >
                          <FileText size={15} className="text-[#731515] shrink-0" />
                          <span className="truncate max-w-xs">{file.name}</span>
                          <span className="text-[#7a4a4a]/40 text-xs shrink-0">
                            ({fmtSize(file.size)})
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontFamily: 'var(--font-nunito)' }}>
                          <Upload size={20} className="text-[#7a4a4a]/25 mx-auto mb-2" />
                          <p className="text-sm text-[#7a4a4a]/45">
                            Clicca per selezionare un PDF
                          </p>
                          <p className="text-xs text-[#7a4a4a]/30 mt-1">
                            Solo .pdf · Max 20 MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {uploadError && (
                    <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {uploadError}
                    </p>
                  )}

                  <button
                    type="submit" disabled={uploading}
                    className="w-full py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] disabled:opacity-55 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg flex items-center justify-center gap-2"
                  >
                    {uploading
                      ? <><Loader2 size={12} className="animate-spin" /> CARICAMENTO…</>
                      : <><Upload size={12} /> CARICA</>
                    }
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-[#731515] text-center py-6" style={{ fontFamily: 'var(--font-nunito)' }}>
          {error}
        </p>
      )}

      {/* ── Document list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#e8d5d5] border-t-[#731515] rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white border border-dashed border-[#eddada] rounded-xl p-16 text-center">
          <FolderOpen size={32} className="text-[#7a4a4a]/20 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessun documento caricato ancora.
          </p>
          <p className="text-xs text-[#7a4a4a]/30 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            Usa il pulsante qui sopra per iniziare.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#eddada] rounded-xl shadow-[0_1px_4px_rgba(107,26,26,0.06),0_6px_20px_rgba(107,26,26,0.04)] overflow-hidden">

          {/* Table head */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4 px-5 py-3 border-b border-[#f0e4e4] bg-[#fdf9f9]">
            <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/50">DOCUMENTO</div>
            <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/50">CATEGORIA</div>
            <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/50">CARICATO DA</div>
            <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/50">DATA</div>
            <div />
          </div>

          <div className="divide-y divide-[#f5eded]">
            {docs.map(doc => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4 items-center px-5 py-4 hover:bg-[#fdf9f9] transition-colors duration-150">

                  {/* Title block */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-[#731515] shrink-0" />
                      <span
                        className="text-sm font-medium text-[#1a0505] truncate"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {doc.title}
                      </span>
                    </div>
                    {doc.description && (
                      <p
                        className="text-[11px] text-[#7a4a4a]/55 mt-0.5 ml-[21px] truncate"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {doc.description}
                      </p>
                    )}
                    <p className="text-[10px] text-[#7a4a4a]/30 mt-0.5 ml-[21px] font-mono">
                      {doc.file_name}{doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''}
                    </p>
                  </div>

                  <CategoryBadge category={doc.category} />

                  <span
                    className="text-[11px] text-[#7a4a4a]/55 truncate max-w-[120px]"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {doc.uploaded_by.split('@')[0]}
                  </span>

                  <span
                    className="text-[11px] text-[#7a4a4a]/45 whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {fmtDate(doc.created_at)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloading === doc.id}
                      title="Scarica"
                      className="w-8 h-8 flex items-center justify-center bg-white border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all duration-200 rounded-lg"
                    >
                      {downloading === doc.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Download size={12} />
                      }
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc.id}
                        title="Elimina"
                        className="w-8 h-8 flex items-center justify-center bg-white border border-[#e8d5d5] text-[#7a4a4a]/50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 transition-all duration-200 rounded-lg"
                      >
                        {deleting === doc.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Trash2 size={12} />
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden px-4 py-4 hover:bg-[#fdf9f9] transition-colors duration-150">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <FileText size={14} className="text-[#731515] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium text-[#1a0505] leading-snug"
                          style={{ fontFamily: 'var(--font-syne)' }}
                        >
                          {doc.title}
                        </p>
                        {doc.description && (
                          <p
                            className="text-[11px] text-[#7a4a4a]/55 mt-0.5"
                            style={{ fontFamily: 'var(--font-nunito)' }}
                          >
                            {doc.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <CategoryBadge category={doc.category} />
                          <span
                            className="text-[10px] text-[#7a4a4a]/40"
                            style={{ fontFamily: 'var(--font-nunito)' }}
                          >
                            {fmtDate(doc.created_at)} · {doc.uploaded_by.split('@')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloading === doc.id}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all duration-200 rounded-lg"
                      >
                        {downloading === doc.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Download size={12} />
                        }
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-[#e8d5d5] text-[#7a4a4a]/50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 transition-all duration-200 rounded-lg"
                        >
                          {deleting === doc.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Trash2 size={12} />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
