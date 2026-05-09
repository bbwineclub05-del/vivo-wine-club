'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
  CalendarDays, MapPin, Tag, Users, CheckCircle2, Clock, XCircle, Globe, ScanLine,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import EventScanner from '@/components/EventScanner';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface DbEvent {
  id: string;
  slug: string;
  title: string;
  type: string;
  section: string;
  date: string;
  time: string | null;
  location: string;
  location_full: string;
  description: string;
  price: number;
  capacity: number | null;
  status: 'open' | 'soldout' | 'soon' | 'completed';
  published: boolean;
  title_strikethrough: boolean;
  image_url: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
  created_at: string;
}

type FormData = Omit<DbEvent, 'id' | 'slug' | 'stripe_product_id' | 'stripe_price_id' | 'created_at'>;

const BLANK: FormData = {
  title: '', type: 'WINERY VISIT', section: 'winery_visit', date: '', time: '',
  location: '', location_full: '', description: '',
  price: 0, capacity: null, status: 'open',
  published: false, title_strikethrough: false,
  image_url: null, sort_order: 0,
};

const SECTIONS = [
  { value: 'wine_party',    label: 'Wine Party'     },
  { value: 'wine_lounge',   label: 'Wine Lounge'    },
  { value: 'winery_visit',  label: 'Winery Visit'   },
  { value: 'general',       label: 'Generale (tutti)' },
];

const EVENT_TYPES = [
  'WINERY VISIT', 'PARTY', 'APERITIF', 'APERITIF · COLLAB',
  'TASTING', 'MASTERCLASS', 'WEEKEND',
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function StatusPill({ status }: { status: DbEvent['status'] }) {
  const map: Record<DbEvent['status'], { label: string; cls: string }> = {
    open:      { label: 'OPEN',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    soldout:   { label: 'SOLD OUT',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    soon:      { label: 'COMING SOON', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    completed: { label: 'COMPLETED', cls: 'bg-[#f5f0f0] text-[#9a7070] border-[#e8d5d5]' },
  };
  const { label, cls } = map[status] ?? map.open;
  return (
    <span className={`inline-block text-[8px] tracking-[0.3em] border px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Input helpers
───────────────────────────────────────────── */
const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[9px] tracking-[0.38em] text-[#731515] mb-1.5 uppercase">
      {children}
    </label>
  );
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#731515]' : 'bg-[#e8d5d5]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
        {label}
      </span>
    </label>
  );
}

/* ─────────────────────────────────────────────
   Event form (create / edit)
───────────────────────────────────────────── */
function EventForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: FormData;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  const [f, setF] = useState<FormData>(initial);
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setF(p => ({ ...p, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-[#eddada] rounded-xl p-6 mb-5 shadow-[0_2px_12px_rgba(107,26,26,0.08)]"
    >
      <h3
        className="text-lg font-light text-[#1a0505] mb-6"
        style={{ fontFamily: 'var(--font-syne)' }}
      >
        {initial.title ? 'Modifica Evento' : 'Nuovo Evento'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Title */}
        <div className="md:col-span-2">
          <Label>Titolo *</Label>
          <input className={inputCls} value={f.title}
            onChange={e => set('title', e.target.value)} placeholder="Wine Party · Forte dei Marmi" required />
        </div>

        {/* Type */}
        <div>
          <Label>Tipo</Label>
          <select className={inputCls} value={f.type} onChange={e => set('type', e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Section */}
        <div>
          <Label>Sezione del sito</Label>
          <select className={inputCls} value={f.section} onChange={e => set('section', e.target.value)}>
            {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <p className="mt-1 text-[10px] text-[#7a4a4a]/50">
            Determina in quale pagina experience appare l&apos;evento.
          </p>
        </div>

        {/* Status */}
        <div>
          <Label>Stato</Label>
          <select className={inputCls} value={f.status}
            onChange={e => set('status', e.target.value as FormData['status'])}>
            <option value="open">Open — prenotabile</option>
            <option value="soldout">Sold Out</option>
            <option value="soon">Coming Soon</option>
            <option value="completed">Completato</option>
          </select>
        </div>

        {/* Date */}
        <div>
          <Label>Data *</Label>
          <input className={inputCls} type="date" value={f.date}
            onChange={e => set('date', e.target.value)} required />
        </div>

        {/* Time */}
        <div>
          <Label>Ora (opzionale)</Label>
          <input className={inputCls} type="text" value={f.time ?? ''}
            onChange={e => set('time', e.target.value || null)} placeholder="19:00" />
        </div>

        {/* Location */}
        <div>
          <Label>Location breve *</Label>
          <input className={inputCls} value={f.location}
            onChange={e => set('location', e.target.value)} placeholder="Franciacorta, Italy" required />
        </div>

        {/* Location full */}
        <div>
          <Label>Location completa *</Label>
          <input className={inputCls} value={f.location_full}
            onChange={e => set('location_full', e.target.value)}
            placeholder="Ca' del Bosco, Erbusco — ore 11:00" required />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Label>Descrizione *</Label>
          <textarea className={`${inputCls} resize-none`} rows={4} value={f.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Descrizione dell'evento per la pagina pubblica..." required />
        </div>

        {/* Price */}
        <div>
          <Label>Prezzo (€) — 0 = gratuito</Label>
          <input className={inputCls} type="number" min={0} step={1} value={f.price}
            onChange={e => set('price', parseFloat(e.target.value) || 0)} />
          {f.price > 0 && (
            <p className="mt-1 text-[10px] text-[#731515]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
              Prodotto Stripe creato automaticamente al salvataggio
            </p>
          )}
        </div>

        {/* Capacity */}
        <div>
          <Label>Posti disponibili (lascia vuoto = illimitati)</Label>
          <input className={inputCls} type="number" min={1}
            value={f.capacity ?? ''}
            onChange={e => set('capacity', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="50" />
        </div>

        {/* Image URL */}
        <div className="md:col-span-2">
          <Label>URL Immagine (opzionale)</Label>
          <input className={inputCls} type="text" value={f.image_url ?? ''}
            onChange={e => set('image_url', e.target.value || null)}
            placeholder="/events/wine-party8.jpg oppure URL esterno" />
        </div>

        {/* Sort order */}
        <div>
          <Label>Ordinamento (numero, basso = prima)</Label>
          <input className={inputCls} type="number" value={f.sort_order}
            onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-3 justify-center">
          <Toggle label="Pubblicato (visibile sul sito)" checked={f.published} onChange={v => set('published', v)} />
          <Toggle label="Titolo barrato" checked={f.title_strikethrough} onChange={v => set('title_strikethrough', v)} />
        </div>

      </div>

      {error && (
        <p className="mt-4 text-sm text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => onSave(f)}
          disabled={saving || !f.title || !f.date || !f.location || !f.description}
          className="px-6 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
        >
          {saving ? 'SALVATAGGIO…' : 'SALVA EVENTO'}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] hover:border-[#731515]/40 transition-colors rounded-lg"
        >
          ANNULLA
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Single event row
───────────────────────────────────────────── */
function EventRow({
  event,
  onEdit,
  onDelete,
  onTogglePublished,
  onScan,
}: {
  event: DbEvent;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onScan: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  return (
    <div className="bg-white border border-[#eddada] rounded-xl shadow-[0_1px_4px_rgba(107,26,26,0.05)] overflow-hidden">
      <div className="flex items-center gap-4 p-4">

        {/* Date badge */}
        <div className="w-12 shrink-0 text-center">
          <div className="text-[8px] tracking-[0.3em] text-[#731515]">
            {event.date ? event.date.split('-')[1]
              ? ['','JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][
                  parseInt(event.date.split('-')[1])
                ]
              : '' : ''}
          </div>
          <div className="text-2xl font-light text-[#1a0505] leading-tight" style={{ fontFamily: 'var(--font-syne)' }}>
            {event.date ? parseInt(event.date.split('-')[2]) : '?'}
          </div>
          <div className="text-[8px] text-[#7a4a4a]/50">
            {event.date ? event.date.split('-')[0] : ''}
          </div>
        </div>

        {/* Vertical line */}
        <div className="w-px h-10 bg-[#eddada] shrink-0" />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/60">{event.type}</span>
            <StatusPill status={event.status} />
            {event.price > 0 && (
              <span className="inline-flex items-center gap-1 text-[8px] tracking-[0.2em] bg-[#731515]/8 text-[#731515] px-2 py-0.5 rounded-full border border-[#731515]/15">
                <Tag size={8} /> €{event.price}
              </span>
            )}
            {!event.published && (
              <span className="text-[8px] tracking-[0.2em] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200">
                NASCOSTO
              </span>
            )}
          </div>
          <div
            className={`text-[15px] font-medium text-[#1a0505] mt-0.5 truncate ${event.title_strikethrough ? 'line-through decoration-[#731515]/50' : ''}`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.title}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#7a4a4a]/60">
            <MapPin size={9} className="text-[#731515]/50 shrink-0" />
            <span className="truncate" style={{ fontFamily: 'var(--font-nunito)' }}>{event.location}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scanner */}
          <button
            onClick={onScan}
            title="Event Scanner"
            className="p-2 rounded-lg text-[#7a4a4a]/60 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
          >
            <ScanLine size={14} />
          </button>

          {/* Published toggle */}
          <button
            onClick={onTogglePublished}
            title={event.published ? 'Nascondi' : 'Pubblica'}
            className={`p-2 rounded-lg transition-colors ${
              event.published
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-slate-400 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            {event.published ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-[#7a4a4a] hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
          >
            <Pencil size={14} />
          </button>

          {/* Delete */}
          {delConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="px-2 py-1 rounded bg-red-600 text-white text-[9px] tracking-wide hover:bg-red-700 transition-colors"
              >
                ELIMINA
              </button>
              <button
                onClick={() => setDelConfirm(false)}
                className="px-2 py-1 rounded border border-[#eddada] text-[9px] text-[#7a4a4a] hover:bg-[#fdf6f6] transition-colors"
              >
                NO
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDelConfirm(true)}
              className="p-2 rounded-lg text-[#7a4a4a]/50 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Expand */}
          <button
            onClick={() => setExpanded(x => !x)}
            className="p-2 rounded-lg text-[#7a4a4a]/50 hover:text-[#1a0505] hover:bg-[#fdf6f6] transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#eddada]"
          >
            <div className="px-5 py-4 text-sm text-[#7a4a4a] space-y-2" style={{ fontFamily: 'var(--font-nunito)' }}>
              <p><span className="text-[#731515] font-medium">Location completa:</span> {event.location_full}</p>
              {event.time && <p><span className="text-[#731515] font-medium">Ora:</span> {event.time}</p>}
              {event.capacity && <p><span className="text-[#731515] font-medium">Capacità:</span> {event.capacity} posti</p>}
              {event.image_url && <p><span className="text-[#731515] font-medium">Immagine:</span> {event.image_url}</p>}
              {event.stripe_product_id && (
                <p><span className="text-[#731515] font-medium">Stripe Product:</span>
                  <code className="ml-1 text-[10px] bg-slate-100 px-1 rounded">{event.stripe_product_id}</code>
                </p>
              )}
              <p className="leading-relaxed"><span className="text-[#731515] font-medium">Descrizione:</span> {event.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function EventManager() {
  const [events,      setEvents]      = useState<DbEvent[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [mode,        setMode]        = useState<'list' | 'create' | { edit: DbEvent }>('list');
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState('');
  const [scannerEvent,  setScannerEvent]  = useState<DbEvent | null>(null);
  const [accessToken,   setAccessToken]   = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const load = () => {
    setLoading(true);
    fetch('/api/events/all')
      .then(r => r.json())
      .then(j => setEvents(Array.isArray(j.events) ? j.events : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  /* ── KPIs ── */
  const total     = events.length;
  const published = events.filter(e => e.published).length;
  const open      = events.filter(e => e.status === 'open').length;

  /* ── Save handler ── */
  async function handleSave(data: FormData) {
    setFormErr('');
    setSaving(true);
    try {
      const isEdit = typeof mode === 'object' && 'edit' in mode;
      const slug   = isEdit ? mode.edit.slug : null;
      const url    = isEdit ? `/api/events/${slug}` : '/api/events';
      const method = isEdit ? 'PATCH' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? 'Errore nel salvataggio');

      setMode('list');
      load();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete handler ── */
  async function handleDelete(slug: string) {
    try {
      await fetch(`/api/events/${slug}`, { method: 'DELETE' });
      load();
    } catch (err) {
      console.error('[EventManager delete]', err);
    }
  }

  /* ── Toggle published ── */
  async function handleToggle(event: DbEvent) {
    try {
      await fetch(`/api/events/${event.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !event.published }),
      });
      load();
    } catch (err) {
      console.error('[EventManager toggle]', err);
    }
  }

  /* ── Header ── */
  return (
    <div>
      {/* Scanner modal */}
      <AnimatePresence>
        {scannerEvent && accessToken && (
          <EventScanner
            event={{
              id:    scannerEvent.id,
              slug:  scannerEvent.slug,
              title: scannerEvent.title,
              date:  scannerEvent.date,
            }}
            accessToken={accessToken}
            onClose={() => setScannerEvent(null)}
          />
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">ADMIN</div>
          <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
            Gestione Eventi
          </h2>
        </div>

        {mode === 'list' && (
          <button
            onClick={() => { setFormErr(''); setMode('create'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] transition-colors rounded-lg"
          >
            <Plus size={13} />
            NUOVO EVENTO
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { icon: CalendarDays, label: 'Totale',      value: total,     color: 'text-[#731515]' },
          { icon: Globe,        label: 'Pubblicati',  value: published, color: 'text-emerald-600' },
          { icon: CheckCircle2, label: 'Prenotabili', value: open,      color: 'text-[#731515]' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white border border-[#eddada] rounded-xl p-4 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className={color} />
              <span className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/60">{label.toUpperCase()}</span>
            </div>
            <div className={`text-2xl font-light ${color}`} style={{ fontFamily: 'var(--font-syne)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Form (create / edit) */}
      <AnimatePresence>
        {mode !== 'list' && (
          <EventForm
            key="form"
            initial={typeof mode === 'object' && 'edit' in mode
              ? {
                  title:              mode.edit.title,
                  type:               mode.edit.type,
                  date:               mode.edit.date,
                  time:               mode.edit.time,
                  location:           mode.edit.location,
                  location_full:      mode.edit.location_full,
                  description:        mode.edit.description,
                  price:              mode.edit.price,
                  capacity:           mode.edit.capacity,
                  status:             mode.edit.status,
                  published:          mode.edit.published,
                  title_strikethrough: mode.edit.title_strikethrough,
                  image_url:          mode.edit.image_url,
                  sort_order:         mode.edit.sort_order,
                  section:            mode.edit.section ?? 'general',
                }
              : BLANK
            }
            onSave={handleSave}
            onCancel={() => { setMode('list'); setFormErr(''); }}
            saving={saving}
            error={formErr}
          />
        )}
      </AnimatePresence>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-[#7a4a4a]/50 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
          <CalendarDays size={32} className="mx-auto mb-3 text-[#eddada]" />
          Nessun evento trovato. Crea il primo evento con il pulsante qui sopra.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <EventRow
              key={event.id || event.slug}
              event={event}
              onEdit={() => { setFormErr(''); setMode({ edit: event }); }}
              onDelete={() => handleDelete(event.slug)}
              onTogglePublished={() => handleToggle(event)}
              onScan={() => setScannerEvent(event)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
