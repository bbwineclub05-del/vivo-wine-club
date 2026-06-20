'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Pencil, Trash2, CalendarDays, List,
  ChevronLeft, ChevronRight, ChevronDown, Loader2, CheckCircle2, Circle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type PedStatus = 'planned' | 'published';

interface PedEntry {
  id: string;
  date: string;
  title: string;
  description: string | null;
  platform: string;
  content_type: string;
  status: PedStatus;
  assigned_to: string | null;
  notes: string | null;
  media_url: string | null;
  created_at: string;
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const PLATFORMS = ['Instagram', 'LinkedIn', 'WhatsApp', 'Newsletter', 'Sito Web', 'TikTok', 'Altro'];
const CONTENT_TYPES = ['Post', 'Reel', 'Story', 'Articolo', 'Email', 'Video', 'Foto', 'Altro'];

const STATUS_CFG: Record<PedStatus, { label: string; cls: string }> = {
  planned:   { label: 'Da fare',     cls: 'bg-blue-50 text-blue-700 border-blue-200'           },
  published: { label: 'Pubblicato',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200'  },
};

const PLATFORM_COLOR: Record<string, string> = {
  Instagram:   '#e1306c',
  LinkedIn:    '#0a66c2',
  WhatsApp:    '#25d366',
  Newsletter:  '#731515',
  'Sito Web':  '#374151',
  TikTok:      '#010101',
  Altro:       '#7a4a4a',
};

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];
const DAYS_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

function mondayFirst(d: number) { return d === 0 ? 6 : d - 1; }

const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2.5 text-sm ' +
  'placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

/* ─────────────────────────────────────────────
   Publish toggle button
───────────────────────────────────────────── */
function PublishBtn({
  entry,
  onToggle,
}: {
  entry: PedEntry;
  onToggle: (id: string, next: PedStatus) => void;
}) {
  const published = entry.status === 'published';
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(entry.id, published ? 'planned' : 'published'); }}
      title={published ? 'Segna come da fare' : 'Segna come pubblicato'}
      className={`shrink-0 p-1 rounded-lg transition-all duration-150 ${
        published
          ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
          : 'text-[#7a4a4a]/25 hover:text-emerald-500 hover:bg-emerald-50'
      }`}
    >
      {published
        ? <CheckCircle2 size={22} strokeWidth={1.8} />
        : <Circle       size={22} strokeWidth={1.5} />
      }
    </button>
  );
}

/* ─────────────────────────────────────────────
   Entry Modal  (no status field — always 'planned' on create)
───────────────────────────────────────────── */
interface FormState {
  date: string;
  title: string;
  description: string;
  platform: string;
  content_type: string;
  assigned_to: string;
  notes: string;
}

const EMPTY: FormState = {
  date: '',
  title: '',
  description: '',
  platform: 'Instagram',
  content_type: 'Post',
  assigned_to: '',
  notes: '',
};

function EntryModal({
  token,
  editTarget,
  defaultDate,
  onClose,
  onSaved,
}: {
  token: string;
  editTarget: PedEntry | null;
  defaultDate?: string;
  onClose: () => void;
  onSaved: (entry: PedEntry) => void;
}) {
  const isEdit = !!editTarget;
  const [form, setForm] = useState<FormState>(
    editTarget
      ? {
          date:         editTarget.date,
          title:        editTarget.title,
          description:  editTarget.description ?? '',
          platform:     editTarget.platform,
          content_type: editTarget.content_type,
          assigned_to:  editTarget.assigned_to ?? '',
          notes:        editTarget.notes ?? '',
        }
      : { ...EMPTY, date: defaultDate ?? '' },
  );
  const [file,    setFile]    = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.title.trim() || !form.platform || !form.content_type) {
      setError('Data, titolo, piattaforma e tipo contenuto sono obbligatori.');
      return;
    }
    setError(''); setLoading(true);
    try {
      let res: Response;
      if (isEdit && editTarget) {
        res = await fetch(`/api/ped/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            date:         form.date,
            title:        form.title.trim(),
            description:  form.description.trim() || null,
            platform:     form.platform,
            content_type: form.content_type,
            assigned_to:  form.assigned_to.trim() || null,
            notes:        form.notes.trim() || null,
          }),
        });
      } else {
        const fd = new FormData();
        fd.append('date',         form.date);
        fd.append('title',        form.title.trim());
        fd.append('platform',     form.platform);
        fd.append('content_type', form.content_type);
        fd.append('status',       'planned');
        if (form.description.trim()) fd.append('description',  form.description.trim());
        if (form.assigned_to.trim()) fd.append('assigned_to',  form.assigned_to.trim());
        if (form.notes.trim())       fd.append('notes',        form.notes.trim());
        if (file)                    fd.append('file', file);
        res = await fetch('/api/ped', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      onSaved(data.entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eddada] sticky top-0 bg-white z-10">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">PIANO EDITORIALE</div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {isEdit ? 'Modifica entry' : 'Nuova entry'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors p-1"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Date */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DATA *</div>
            <input type="date" className={inputCls} value={form.date} onChange={e => setField('date', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Title */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TITOLO *</div>
            <input className={inputCls} placeholder="Titolo del contenuto…" value={form.title} onChange={e => setField('title', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Platform + Content type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">PIATTAFORMA *</div>
              <select className={inputCls} value={form.platform} onChange={e => setField('platform', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TIPO CONTENUTO *</div>
              <select className={inputCls} value={form.content_type} onChange={e => setField('content_type', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }}>
                {CONTENT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DESCRIZIONE <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Descrizione del contenuto…" value={form.description} onChange={e => setField('description', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Assigned to */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">ASSEGNATO A <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
            <input className={inputCls} placeholder="Nome responsabile…" value={form.assigned_to} onChange={e => setField('assigned_to', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Notes */}
          <div>
            <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOTE <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Note interne…" value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* File upload (create only) */}
          {!isEdit && (
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">ALLEGATO <span className="text-[#7a4a4a]/40 normal-case tracking-normal">— opzionale</span></div>
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-[#7a4a4a] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:tracking-[0.2em] file:bg-[#731515] file:text-white hover:file:bg-[#9b2323] file:cursor-pointer"
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>
          )}

          {error && (
            <p className="text-[11px] text-red-600" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[10px] tracking-[0.2em] text-[#7a4a4a] hover:text-[#1a0505] transition-colors" style={{ fontFamily: 'var(--font-nunito)' }}>
              ANNULLA
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#731515] text-white text-[10px] tracking-[0.2em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {loading && <Loader2 size={11} className="animate-spin" />}
              {isEdit ? 'SALVA' : 'CREA'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Calendar View
───────────────────────────────────────────── */
function PedCalendar({
  entries,
  onDayClick,
  onEntryClick,
  onToggleStatus,
}: {
  entries:        PedEntry[];
  onDayClick:     (date: string) => void;
  onEntryClick:   (entry: PedEntry) => void;
  onToggleStatus: (id: string, next: PedStatus) => void;
}) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calView,    setCalView]    = useState<'month' | 'week'>('month');
  const [weekStart,  setWeekStart]  = useState<Date>(() => {
    const n = new Date();
    const day = n.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(n);
    mon.setDate(n.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  const year = month.getFullYear();
  const mon  = month.getMonth();
  const daysInMonth    = new Date(year, mon + 1, 0).getDate();
  const firstDayOfWeek = mondayFirst(new Date(year, mon, 1).getDay());

  const todayStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  const dayMap: Record<string, PedEntry[]> = {};
  for (const e of entries) {
    const key = e.date.slice(0, 10);
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(e);
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEntries = selectedDay ? (dayMap[selectedDay] ?? []) : [];

  function handleDayClick(dayStr: string) {
    setSelectedDay(prev => prev === dayStr ? null : dayStr);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function weekRangeLabel(): string {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()} - ${end.getDate()} ${MONTHS_IT[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTHS_IT[weekStart.getMonth()]} - ${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`;
  }

  return (
    <div className="space-y-4">
      {/* Nav + view toggle */}
      <div className="flex items-center justify-between bg-white border border-[#eddada] rounded-xl px-5 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => calView === 'month'
              ? setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              : setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })
            }
            className="p-1.5 rounded-lg hover:bg-[#fdf6f6] transition-colors text-[#7a4a4a] hover:text-[#731515]"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-light tracking-[0.1em] text-[#1a0505] min-w-[180px] text-center" style={{ fontFamily: 'var(--font-syne)' }}>
            {calView === 'month' ? `${MONTHS_IT[mon]} ${year}` : weekRangeLabel()}
          </span>
          <button
            onClick={() => calView === 'month'
              ? setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              : setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })
            }
            className="p-1.5 rounded-lg hover:bg-[#fdf6f6] transition-colors text-[#7a4a4a] hover:text-[#731515]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        {/* Month / Week toggle */}
        <div className="flex gap-0.5 bg-[#fdf6f6] border border-[#eddada] rounded-lg p-0.5">
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setCalView(v)}
              className={`px-3 py-1.5 text-[9px] tracking-[0.2em] rounded-lg transition-all duration-150 ${
                calView === v ? 'bg-[#731515] text-white shadow-sm' : 'text-[#7a4a4a] hover:text-[#731515]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {v === 'month' ? 'MESE' : 'SETTIMANA'}
            </button>
          ))}
        </div>
      </div>

      {/* Month grid */}
      {calView === 'month' && (
        <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#eddada]">
            {DAYS_SHORT.map(d => (
              <div key={d} className="px-2 py-2.5 text-center text-[9px] tracking-[0.25em] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-[#eddada]">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[80px] bg-[#fdf6f6]/30" />;
              const dayStr = `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const items  = dayMap[dayStr] ?? [];
              const isToday    = dayStr === todayStr;
              const isSelected = dayStr === selectedDay;
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(dayStr)}
                  className={`min-h-[80px] p-2 text-left flex flex-col gap-1 transition-colors hover:bg-[#fdf6f6] ${isSelected ? 'bg-[#fdf6f6] ring-1 ring-inset ring-[#731515]/30' : ''}`}
                >
                  <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#731515] text-white font-semibold' : 'text-[#7a4a4a]'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                    {day}
                  </div>
                  {items.map(e => (
                    <div
                      key={e.id}
                      className={`w-full px-1.5 py-0.5 rounded text-[9px] truncate text-white leading-tight ${e.status === 'published' ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: PLATFORM_COLOR[e.platform] ?? '#7a4a4a' }}
                      onClick={ev => { ev.stopPropagation(); onEntryClick(e); }}
                    >
                      {e.status === 'published' && '✓ '}{e.title}
                    </div>
                  ))}
                  {items.length === 0 && isSelected && (
                    <div
                      className="w-full mt-auto text-[8px] tracking-[0.15em] text-[#731515]/50 flex items-center gap-1"
                      onClick={ev => { ev.stopPropagation(); onDayClick(dayStr); }}
                    >
                      <Plus size={9} /> NUOVO
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week grid */}
      {calView === 'week' && (
        <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#eddada]">
            {weekDays.map((d, i) => {
              const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const isToday = dayStr === todayStr;
              return (
                <div key={i} className={`px-2 py-3 text-center border-r border-[#eddada] last:border-r-0 ${isToday ? 'bg-[#fdf6f6]' : ''}`}>
                  <div className="text-[9px] tracking-[0.2em] text-[#7a4a4a]/50 mb-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {DAYS_SHORT[i]}
                  </div>
                  <div className={`text-sm w-7 h-7 mx-auto flex items-center justify-center rounded-full font-light ${isToday ? 'bg-[#731515] text-white' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-syne)' }}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Day columns */}
          <div className="grid grid-cols-7 divide-x divide-[#eddada]">
            {weekDays.map((d, i) => {
              const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const items  = dayMap[dayStr] ?? [];
              const isToday    = dayStr === todayStr;
              const isSelected = dayStr === selectedDay;
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(dayStr)}
                  className={`min-h-[160px] p-2.5 text-left flex flex-col gap-1.5 transition-colors hover:bg-[#fdf6f6] ${
                    isSelected ? 'bg-[#fdf6f6] ring-1 ring-inset ring-[#731515]/30' : isToday ? 'bg-[#fdf6f6]/40' : ''
                  }`}
                >
                  {items.map(e => (
                    <div
                      key={e.id}
                      className={`w-full px-2 py-1 rounded text-white leading-tight ${e.status === 'published' ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: PLATFORM_COLOR[e.platform] ?? '#7a4a4a' }}
                      onClick={ev => { ev.stopPropagation(); onEntryClick(e); }}
                    >
                      <div className="text-[10px] font-medium truncate">{e.status === 'published' && '✓ '}{e.title}</div>
                      <div className="text-[8px] opacity-80 mt-0.5">{e.platform} · {e.content_type}</div>
                    </div>
                  ))}
                  <div
                    className="mt-auto text-[8px] tracking-[0.15em] text-[#731515]/30 flex items-center gap-1"
                    onClick={ev => { ev.stopPropagation(); onDayClick(dayStr); }}
                  >
                    <Plus size={8} /> NUOVO
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day popup */}
      <AnimatePresence>
        {selectedDay && selectedEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-[#eddada] rounded-xl overflow-hidden shadow-md"
          >
            <div className="flex items-center justify-between px-5 py-3 bg-[#fdf6f6] border-b border-[#eddada]">
              <div className="text-[9px] tracking-[0.35em] text-[#731515]">
                {selectedDay.split('-').reverse().join('/')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDayClick(selectedDay)}
                  className="text-[8px] tracking-[0.2em] text-[#731515] hover:text-[#9b2323] transition-colors flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  <Plus size={9} /> NUOVA
                </button>
                <button onClick={() => setSelectedDay(null)} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
                  <X size={13} />
                </button>
              </div>
            </div>
            <div className="divide-y divide-[#eddada]">
              {selectedEntries.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fdf6f6] transition-colors">
                  {/* Publish toggle */}
                  <PublishBtn entry={e} onToggle={onToggleStatus} />

                  {/* Platform dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PLATFORM_COLOR[e.platform] ?? '#7a4a4a' }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEntryClick(e)}>
                    <div className={`text-[12px] font-medium leading-tight ${e.status === 'published' ? 'line-through text-[#7a4a4a]/50' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
                      {e.title}
                    </div>
                    <div className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {e.platform} · {e.content_type}
                      {e.assigned_to && ` · ${e.assigned_to}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1" style={{ fontFamily: 'var(--font-nunito)' }}>
        <span className="text-[9px] text-[#7a4a4a]/40 tracking-[0.2em]">PIATTAFORME</span>
        {PLATFORMS.filter(p => p !== 'Altro').map(p => (
          <div key={p} className="flex items-center gap-1.5 text-[9px] text-[#7a4a4a]">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: PLATFORM_COLOR[p] }} />
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Shared entry row (used in both main list and published accordion)
───────────────────────────────────────────── */
function EntryRow({
  entry,
  index,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  entry:          PedEntry;
  index:          number;
  onEdit:         (e: PedEntry) => void;
  onDelete:       (id: string) => void;
  onToggleStatus: (id: string, next: PedStatus) => void;
}) {
  const [, em, ed] = entry.date.slice(0, 10).split('-');
  const published  = entry.status === 'published';
  return (
    <div
      className={`flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[#fdf6f6] ${index > 0 ? 'border-t border-[#eddada]' : ''}`}
    >
      <PublishBtn entry={entry} onToggle={onToggleStatus} />

      <div className="shrink-0 w-9 text-center">
        <div className={`text-lg font-light leading-none ${published ? 'text-[#7a4a4a]/40' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-syne)' }}>{ed}</div>
        <div className="text-[9px] text-[#7a4a4a]/40 tracking-[0.1em]">{MONTHS_IT[parseInt(em) - 1].slice(0, 3).toUpperCase()}</div>
      </div>

      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PLATFORM_COLOR[entry.platform] ?? '#7a4a4a', opacity: published ? 0.4 : 1 }} />

      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium leading-tight ${published ? 'line-through text-[#7a4a4a]/40' : 'text-[#1a0505]'}`} style={{ fontFamily: 'var(--font-nunito)' }}>
          {entry.title}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PLATFORM_COLOR[entry.platform] ?? '#7a4a4a', opacity: published ? 0.5 : 1, fontFamily: 'var(--font-nunito)' }}>
            {entry.platform}
          </span>
          <span className="text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full bg-[#fdf6f6] text-[#7a4a4a] border border-[#eddada]" style={{ fontFamily: 'var(--font-nunito)' }}>
            {entry.content_type}
          </span>
        </div>
        {entry.description && (
          <p className={`mt-1 text-[11px] leading-relaxed line-clamp-1 ${published ? 'text-[#7a4a4a]/30' : 'text-[#7a4a4a]/60'}`} style={{ fontFamily: 'var(--font-nunito)' }}>{entry.description}</p>
        )}
        {entry.assigned_to && (
          <p className="mt-0.5 text-[10px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>👤 {entry.assigned_to}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg hover:bg-[#fdf6f6] text-[#7a4a4a]/30 hover:text-[#731515] transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#7a4a4a]/30 hover:text-red-600 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   List View
───────────────────────────────────────────── */
function quarterKey(dateStr: string): string {
  const [y, m] = dateStr.slice(0, 7).split('-');
  const q = Math.ceil(parseInt(m) / 3);
  return `${y}-Q${q}`;
}

function quarterLabel(key: string): string {
  const [y, q] = key.split('-');
  return `${q} ${y}`;
}

function quarterSortKey(key: string): string {
  // "2026-Q2" → sort descending (newest first)
  const [y, q] = key.split('-');
  return `${y}-${q}`;
}

function PedList({
  entries,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  entries:        PedEntry[];
  onEdit:         (e: PedEntry) => void;
  onDelete:       (id: string) => void;
  onToggleStatus: (id: string, next: PedStatus) => void;
}) {
  const [platformFilter,   setPlatformFilter]   = useState('');
  const [publishedOpen,    setPublishedOpen]    = useState(false);
  const [openQuarters,     setOpenQuarters]     = useState<Set<string>>(new Set());

  // Split planned vs published
  const planned   = entries.filter(e => e.status === 'planned'   && (!platformFilter || e.platform === platformFilter));
  const published = entries.filter(e => e.status === 'published' && (!platformFilter || e.platform === platformFilter));

  // Group planned by month
  const plannedGroups: Record<string, PedEntry[]> = {};
  for (const e of planned) {
    const key = e.date.slice(0, 7);
    if (!plannedGroups[key]) plannedGroups[key] = [];
    plannedGroups[key].push(e);
  }
  const plannedMonths = Object.keys(plannedGroups).sort();

  // Group published by quarter
  const pubQuarters: Record<string, PedEntry[]> = {};
  for (const e of published) {
    const key = quarterKey(e.date);
    if (!pubQuarters[key]) pubQuarters[key] = [];
    pubQuarters[key].push(e);
  }
  const sortedQuarters = Object.keys(pubQuarters).sort((a, b) => quarterSortKey(b).localeCompare(quarterSortKey(a)));

  function toggleQuarter(key: string) {
    setOpenQuarters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Platform filter only */}
      <div className="flex flex-wrap gap-2">
        <select
          className="bg-white border border-[#eddada] text-[#7a4a4a] text-[11px] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#731515]/50"
          value={platformFilter}
          onChange={e => setPlatformFilter(e.target.value)}
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <option value="">Tutte le piattaforme</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* ── Planned list (main) ── */}
      {planned.length === 0 ? (
        <div className="bg-white border border-[#eddada] rounded-xl py-12 text-center">
          <p className="text-[12px] text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessun contenuto da pubblicare. Ottimo lavoro!
          </p>
        </div>
      ) : (
        plannedMonths.map(monthKey => {
          const [y, m] = monthKey.split('-');
          const label  = `${MONTHS_IT[parseInt(m) - 1]} ${y}`;
          return (
            <div key={monthKey}>
              <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-2 px-1">{label.toUpperCase()}</div>
              <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden">
                {plannedGroups[monthKey].map((e, i) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    index={i}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* ── Published accordion ── */}
      {published.length > 0 && (
        <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setPublishedOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#fdf6f6] transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span className="text-[11px] font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                Pubblicati
              </span>
              <span className="text-[10px] text-[#7a4a4a]/40 bg-[#fdf6f6] border border-[#eddada] px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-nunito)' }}>
                {published.length}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[#7a4a4a]/40 transition-transform duration-200 ${publishedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Expandable body */}
          <AnimatePresence initial={false}>
            {publishedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-[#eddada]"
              >
                <div className="divide-y divide-[#eddada]">
                  {sortedQuarters.map(qKey => {
                    const qEntries = pubQuarters[qKey];
                    const isOpen   = openQuarters.has(qKey);
                    return (
                      <div key={qKey}>
                        {/* Quarter sub-accordion header */}
                        <button
                          onClick={() => toggleQuarter(qKey)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#fdf6f6] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium tracking-[0.2em] text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                              {quarterLabel(qKey).toUpperCase()}
                            </span>
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full" style={{ fontFamily: 'var(--font-nunito)' }}>
                              {qEntries.length} pubblicat{qEntries.length === 1 ? 'o' : 'i'}
                            </span>
                          </div>
                          <ChevronDown
                            size={12}
                            className={`text-[#7a4a4a]/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Quarter entries */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden border-t border-[#eddada]/60"
                            >
                              {qEntries
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .map((e, i) => (
                                  <EntryRow
                                    key={e.id}
                                    entry={e}
                                    index={i}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onToggleStatus={onToggleStatus}
                                  />
                                ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function PedManager() {
  const [entries,     setEntries]     = useState<PedEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<'calendar' | 'list'>('calendar');
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<PedEntry | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [token,       setToken]       = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tk  = session?.access_token ?? '';
      const res = await fetch('/api/ped', { headers: { Authorization: `Bearer ${tk}` } });
      const json = await res.json();
      setEntries(json.entries ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate(date?: string) {
    setEditTarget(null);
    setDefaultDate(date);
    setShowModal(true);
  }

  function openEdit(entry: PedEntry) {
    setEditTarget(entry);
    setDefaultDate(undefined);
    setShowModal(true);
  }

  function handleSaved(entry: PedEntry) {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx]  = entry;
        return next;
      }
      return [...prev, entry].sort((a, b) => a.date.localeCompare(b.date));
    });
    setShowModal(false);
    setEditTarget(null);
  }

  async function handleToggleStatus(id: string, next: PedStatus) {
    // Optimistic update
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: next } : e));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tk  = session?.access_token ?? '';
      const res = await fetch(`/api/ped/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body:    JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        // Rollback
        const prev: PedStatus = next === 'published' ? 'planned' : 'published';
        setEntries(p => p.map(e => e.id === id ? { ...e, status: prev } : e));
      }
    } catch {
      const prev: PedStatus = next === 'published' ? 'planned' : 'published';
      setEntries(p => p.map(e => e.id === id ? { ...e, status: prev } : e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa entry?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    const tk  = session?.access_token ?? '';
    const res = await fetch(`/api/ped/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk}` },
    });
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">ADMIN · SOCIAL</div>
          <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>Piano Editoriale</h2>
        </div>
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#731515] text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-[#9b2323] transition-colors"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <Plus size={11} />
          NUOVA ENTRY
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#fdf6f6] border border-[#eddada] rounded-xl p-1 w-fit">
        {([
          { id: 'calendar', label: 'Calendario', Icon: CalendarDays },
          { id: 'list',     label: 'Lista',       Icon: List         },
        ] as { id: 'calendar' | 'list'; label: string; Icon: React.FC<{ size?: number }> }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2 text-[10px] tracking-[0.22em] rounded-lg transition-all duration-200 ${
              tab === t.id ? 'bg-[#731515] text-white shadow-sm' : 'text-[#7a4a4a] hover:text-[#731515]'
            }`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            <t.Icon size={12} />
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : tab === 'calendar' ? (
        <PedCalendar
          entries={entries}
          onDayClick={openCreate}
          onEntryClick={openEdit}
          onToggleStatus={handleToggleStatus}
        />
      ) : (
        <PedList
          entries={entries}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <EntryModal
            key={editTarget?.id ?? 'new'}
            token={token}
            editTarget={editTarget}
            defaultDate={defaultDate}
            onClose={() => { setShowModal(false); setEditTarget(null); }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
