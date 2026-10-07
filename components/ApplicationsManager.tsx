'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, RefreshCw, Search, X, Check, Clock, RotateCcw, ExternalLink } from 'lucide-react';
import {
  APPLICATION_TYPES,
  STAFF_NOTES_MAX,
  type ApplicationRow,
  type ApplicationStatus,
  type ApplicationType,
} from '@/lib/applications';

/* ── Helpers ── */
const STATUS_ORDER: ApplicationStatus[] = ['pending', 'accepted', 'rejected'];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending:  'PENDING',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending:  'border-amber-400/50 bg-amber-50 text-amber-700',
  accepted: 'border-green-500/40 bg-green-50 text-green-700',
  rejected: 'border-[#e8d5d5] bg-[#fdf6f6] text-[#7a4a4a]/60',
};

const STATUS_COUNT_COLOR: Record<ApplicationStatus, string> = {
  pending:  'text-amber-700',
  accepted: 'text-green-700',
  rejected: 'text-[#7a4a4a]/50',
};

const STATUS_ICONS: Record<ApplicationStatus, React.ReactNode> = {
  pending:  <Clock size={10} />,
  accepted: <Check size={10} />,
  rejected: <X size={10} />,
};

const CONFIRM_COPY: Record<ApplicationStatus, { question: string; yes: string }> = {
  accepted: { question: 'Confermi di accettare questa candidatura?',       yes: 'SÌ, ACCETTA' },
  rejected: { question: 'Confermi di rifiutare questa candidatura?',       yes: 'SÌ, RIFIUTA' },
  pending:  { question: 'Confermi di riportare la candidatura a Pending?', yes: 'SÌ, RIPORTA' },
};

const font = { fontFamily: 'var(--font-nunito)' };
const syne = { fontFamily: 'var(--font-syne)' };

function formatDate(d: string, withTime = false) {
  return new Date(d).toLocaleString('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[8px] tracking-[0.2em] px-2 py-1 border shrink-0 ${STATUS_STYLES[status]}`}>
      {STATUS_ICONS[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ── Detail panel ── */
function DetailPanel({
  type,
  row,
  token,
  onClose,
  onUpdated,
}: {
  type: ApplicationType;
  row: ApplicationRow;
  token: string;
  onClose: () => void;
  onUpdated: (row: ApplicationRow, statusChanged: boolean) => void;
}) {
  const [confirming, setConfirming] = useState<ApplicationStatus | null>(null);
  const [updating, setUpdating]     = useState(false);
  const [actionError, setActionError] = useState('');
  const [notes, setNotes]           = useState(row.staff_notes ?? '');
  const [notesState, setNotesState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function patch(body: Record<string, unknown>): Promise<ApplicationRow> {
    const res = await fetch(`/api/admin/applications/${type.key}/${row.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? 'Errore durante il salvataggio');
    return json.application as ApplicationRow;
  }

  async function confirmStatus() {
    if (!confirming) return;
    setUpdating(true);
    setActionError('');
    try {
      const updated = await patch({ status: confirming });
      setConfirming(null);
      onUpdated(updated, true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setUpdating(false);
    }
  }

  async function saveNotes() {
    setNotesState('saving');
    try {
      const updated = await patch({ staff_notes: notes });
      setNotes(updated.staff_notes ?? '');
      setNotesState('saved');
      onUpdated(updated, false);
    } catch {
      setNotesState('error');
    }
  }

  const notesDirty = notes.trim() !== (row.staff_notes ?? '').trim();
  const shortFields = type.detail.filter((f) => f.kind !== 'long');
  const longFields  = type.detail.filter((f) => f.kind === 'long');

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Candidatura di ${type.name(row)}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 h-full w-full sm:w-[560px] bg-white z-[61] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-[#e8d5d5] shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">{type.label.toUpperCase()}</div>
            <h2 className="text-xl font-light text-[#1a0505] leading-tight truncate" style={syne}>{type.name(row)}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={row.status} />
              <span className="text-[10px] text-[#7a4a4a]/60" style={font}>Inviata il {formatDate(row.created_at, true)}</span>
            </div>
            {row.status !== 'pending' && row.reviewed_by && row.reviewed_at && (
              <div className="mt-1.5 text-[10px] text-[#7a4a4a]/60" style={font}>
                {row.status === 'accepted' ? 'Accettata' : 'Rifiutata'} da {row.reviewed_by} il {formatDate(row.reviewed_at, true)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="w-9 h-9 flex items-center justify-center text-[#7a4a4a]/60 hover:text-[#731515] transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shortFields.map((f) => {
              const v = f.value(row);
              if (v === null || v === '') return null;
              return (
                <div key={f.label} className="min-w-0">
                  <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1">{f.label.toUpperCase()}</div>
                  <div className="text-xs text-[#1a0505] break-words whitespace-pre-wrap" style={font}>
                    {f.kind === 'link' && typeof v === 'string' ? (
                      <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#731515] underline break-all">
                        {v} <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : f.kind === 'bool' ? (v ? 'Sì' : 'No')
                      : f.kind === 'date' && typeof v === 'string' ? formatDate(v, true)
                      : String(v)}
                  </div>
                </div>
              );
            })}
          </div>

          {longFields.map((f) => {
            const v = f.value(row);
            if (!v) return null;
            return (
              <div key={f.label}>
                <div className="text-[8px] tracking-[0.3em] text-[#731515] mb-1.5">{f.label.toUpperCase()}</div>
                <p className="text-xs text-[#4a2a2a] leading-relaxed whitespace-pre-wrap break-words" style={font}>{String(v)}</p>
              </div>
            );
          })}

          {/* Internal notes */}
          <div className="border-t border-[#e8d5d5] pt-5">
            <label htmlFor="application-notes" className="block text-[8px] tracking-[0.3em] text-[#731515] mb-2">
              NOTE INTERNE (VISIBILI SOLO ALLO STAFF)
            </label>
            <textarea
              id="application-notes"
              rows={4}
              maxLength={STAFF_NOTES_MAX}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesState('idle'); }}
              className="w-full border border-[#e8d5d5] px-3 py-2.5 text-xs text-[#1a0505] focus:outline-none focus:border-[#731515]/50 resize-y rounded"
              style={font}
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={saveNotes}
                disabled={!notesDirty || notesState === 'saving'}
                className="text-[9px] tracking-[0.25em] px-4 py-2 border border-[#e8d5d5] bg-white text-[#731515] hover:border-[#731515]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {notesState === 'saving' ? 'SALVATAGGIO…' : 'SALVA NOTE'}
              </button>
              {notesState === 'saved' && <span className="text-[10px] text-green-700" style={font}>Salvato</span>}
              {notesState === 'error' && <span className="text-[10px] text-[#731515]" style={font}>Errore nel salvataggio, riprova.</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-[#e8d5d5] px-6 py-4 shrink-0 bg-[#fdf6f6]">
          {confirming ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[#1a0505]" style={font}>{CONFIRM_COPY[confirming].question}</p>
              <div className="flex gap-2">
                <button
                  onClick={confirmStatus}
                  disabled={updating}
                  className={`inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-4 py-2.5 text-white disabled:opacity-50 transition-colors ${
                    confirming === 'accepted' ? 'bg-green-700 hover:bg-green-800' : 'bg-[#731515] hover:bg-[#9b2323]'
                  }`}
                >
                  {updating ? 'AGGIORNAMENTO…' : CONFIRM_COPY[confirming].yes}
                </button>
                <button
                  onClick={() => { setConfirming(null); setActionError(''); }}
                  disabled={updating}
                  className="text-[9px] tracking-[0.25em] px-4 py-2.5 border border-[#e8d5d5] bg-white text-[#7a4a4a] hover:text-[#731515] disabled:opacity-50 transition-colors"
                >
                  ANNULLA
                </button>
              </div>
            </div>
          ) : row.status === 'pending' ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming('accepted')}
                className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-4 py-2.5 bg-green-700 text-white hover:bg-green-800 transition-colors"
              >
                <Check size={11} /> ACCETTA
              </button>
              <button
                onClick={() => setConfirming('rejected')}
                className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-4 py-2.5 border border-[#e8d5d5] bg-white text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] transition-colors"
              >
                <X size={11} /> RIFIUTA
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming('pending')}
              className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-4 py-2.5 border border-[#e8d5d5] bg-white text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] transition-colors"
            >
              <RotateCcw size={11} /> RIPORTA A PENDING
            </button>
          )}
          {actionError && <p className="mt-2 text-[10px] text-[#731515]" style={font}>{actionError}</p>}
          <p className="mt-3 text-[10px] text-[#7a4a4a]/50" style={font}>Il cambio di stato non invia nessuna email al candidato.</p>
        </div>
      </motion.aside>
    </>
  );
}

/* ── Main component ── */
export default function ApplicationsManager({
  token,
  onChanged,
}: {
  token: string;
  /** Called after a status change, so the parent can refresh the pending badge. */
  onChanged?: () => void;
}) {
  const [typeKey, setTypeKey]   = useState(APPLICATION_TYPES[0].key);
  const type = APPLICATION_TYPES.find((t) => t.key === typeKey) ?? APPLICATION_TYPES[0];

  const [rows, setRows]         = useState<ApplicationRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [tab, setTab]           = useState<ApplicationStatus>('pending');
  const [search, setSearch]     = useState('');
  const [area, setArea]         = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/admin/applications?type=${encodeURIComponent(typeKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Impossibile caricare le candidature');
      setRows(json.applications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }, [token, typeKey]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<ApplicationStatus, number> = { pending: 0, accepted: 0, rejected: 0 };
    for (const r of rows) if (r.status in c) c[r.status]++;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.status !== tab) return false;
      if (area && type.area && type.area.value(r) !== area) return false;
      if (q && !type.name(r).toLowerCase().includes(q) && !type.email(r).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, area, search, type]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  function handleUpdated(updated: ApplicationRow, statusChanged: boolean) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (statusChanged) onChanged?.();
  }

  const closePanel = useCallback(() => setSelectedId(null), []);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#fde8e8] flex items-center justify-center shrink-0">
            <Inbox size={15} className="text-[#731515]" />
          </div>
          {APPLICATION_TYPES.length > 1 ? (
            <select
              value={typeKey}
              onChange={(e) => { setTypeKey(e.target.value); setArea(''); setSelectedId(null); }}
              className="text-[10px] tracking-[0.3em] text-[#1a0505] bg-white border border-[#e8d5d5] px-3 py-1.5"
            >
              {APPLICATION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label.toUpperCase()}</option>)}
            </select>
          ) : (
            <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">{type.label.toUpperCase()}</h2>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center border border-[#e8d5d5] bg-white text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all duration-200"
          aria-label="Aggiorna"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`p-4 border text-left transition-colors duration-200 ${
              tab === s ? 'border-[#731515]/40 bg-[#fde8e8]' : 'border-[#e8d5d5] bg-white hover:border-[#731515]/20'
            }`}
          >
            <div className="text-[8px] tracking-[0.3em] text-[#7a4a4a]/50 mb-1">{STATUS_LABELS[s]}</div>
            <div className={`text-2xl font-light ${STATUS_COUNT_COLOR[s]}`} style={syne}>{counts[s]}</div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e8d5d5]">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`text-[9px] tracking-[0.2em] px-4 py-2.5 transition-colors duration-200 border-b-2 -mb-px ${
              tab === s ? 'border-[#731515] text-[#731515]' : 'border-transparent text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
            }`}
            style={font}
          >
            {STATUS_LABELS[s]}
            <span className="ml-1 opacity-50">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a4a4a]/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o email…"
            className="w-full pl-9 pr-3 py-2.5 text-xs border border-[#e8d5d5] bg-white text-[#1a0505] placeholder-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/40"
            style={font}
          />
        </div>
        {type.area && (
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Filtra per area"
            className="sm:w-56 px-3 py-2.5 text-xs border border-[#e8d5d5] bg-white text-[#1a0505] focus:outline-none focus:border-[#731515]/40"
            style={font}
          >
            <option value="">Tutte le aree</option>
            {type.area.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {loading && rows.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#7a4a4a]/40 italic" style={font}>Caricamento candidature…</div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-[#731515]" style={font}>{error}</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#7a4a4a]/40 italic" style={font}>
          {search || area ? 'Nessuna candidatura corrisponde ai filtri.' : `Nessuna candidatura ${STATUS_LABELS[tab].toLowerCase()}.`}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-[#e8d5d5] overflow-hidden">
            <table className="w-full text-left" style={font}>
              <thead className="bg-[#fdf6f6]">
                <tr className="text-[8px] tracking-[0.3em] text-[#731515]">
                  <th className="px-4 py-3 font-normal">NOME</th>
                  <th className="px-4 py-3 font-normal">EMAIL</th>
                  {type.area && <th className="px-4 py-3 font-normal">AREA</th>}
                  {type.listExtra && <th className="px-4 py-3 font-normal">{type.listExtra.label.toUpperCase()}</th>}
                  <th className="px-4 py-3 font-normal">INVIATA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(r.id); } }}
                    tabIndex={0}
                    className="border-t border-[#e8d5d5] text-xs text-[#1a0505] cursor-pointer hover:bg-[#fdf6f6] focus:outline-none focus-visible:bg-[#fde8e8] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium" style={syne}>{type.name(r)}</td>
                    <td className="px-4 py-3 text-[#7a4a4a] truncate max-w-[220px]">{type.email(r)}</td>
                    {type.area && <td className="px-4 py-3">{type.area.label(r)}</td>}
                    {type.listExtra && <td className="px-4 py-3 text-[#7a4a4a]">{type.listExtra.value(r)}</td>}
                    <td className="px-4 py-3 text-[#7a4a4a]/70 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-2">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="w-full text-left bg-white border border-[#e8d5d5] p-4 hover:bg-[#fdf6f6] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1a0505] truncate" style={syne}>{type.name(r)}</div>
                    <div className="text-[11px] text-[#7a4a4a]/70 truncate" style={font}>{type.email(r)}</div>
                  </div>
                  <span className="text-[10px] text-[#7a4a4a]/50 whitespace-nowrap" style={font}>{formatDate(r.created_at)}</span>
                </div>
                <div className="mt-2 text-[11px] text-[#4a2a2a]" style={font}>
                  {[type.area?.label(r), type.listExtra?.value(r)].filter(Boolean).join(' · ')}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {selected && (
          <DetailPanel
            key={selected.id}
            type={type}
            row={selected}
            token={token}
            onClose={closePanel}
            onUpdated={handleUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
