'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
  CalendarDays, MapPin, Tag, Users, CheckCircle2, Clock, XCircle, Globe, ScanLine,
  Send, X, Check, ImagePlus, Loader2, ClipboardList, UserCheck, Link2, Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import EventScanner from '@/components/EventScanner';
import EventGuestPanel from '@/components/EventGuestPanel';
import EventPartnerPanel from '@/components/EventPartnerPanel';
import EventEmailModalAdvanced, { type CustomCategoryInfo } from '@/components/EventEmailModalAdvanced';
import { useMobileOverlay, useOverlayBackClose } from '@/lib/useMobileOverlay';

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
  guest_list_enabled: boolean;
  is_list_only: boolean;
  referral_enabled: boolean;
  registration_closed: boolean;
  image_url: string | null;
  location_map_url: string | null;
  parking_map_url: string | null;
  parking_map_url_2: string | null;
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
  published: false, title_strikethrough: false, guest_list_enabled: false,
  is_list_only: false, referral_enabled: false, registration_closed: false,
  image_url: null, location_map_url: null, parking_map_url: null, parking_map_url_2: null, sort_order: 0,
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
  token,
}: {
  initial: FormData;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  token: string | null;
}) {
  const [f, setF]               = useState<FormData>(initial);
  const [imgUploading, setImgUploading] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setF(p => ({ ...p, [k]: v }));

  async function handleImageFile(file: File) {
    if (!token) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append('file',   file);
      fd.append('folder', 'events');
      const res  = await fetch('/api/media/upload', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();
      if (data.url) set('image_url', data.url);
    } catch { /* non-fatal */ }
    finally  { setImgUploading(false); }
  }

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

        {/* Location map link */}
        <div className="md:col-span-2">
          <Label>Link mappa location (opzionale)</Label>
          <input className={inputCls} type="url" value={f.location_map_url ?? ''}
            onChange={e => set('location_map_url', e.target.value || null)}
            placeholder="https://maps.google.com/..." />
          <p className="mt-1 text-[10px] text-[#7a4a4a]/50">
            Se compilato, nell&apos;email di conferma iscrizione lista la parola &quot;Luogo&quot; diventa cliccabile e apre questa mappa.
          </p>
        </div>

        {/* Parking / shuttle map links */}
        <div>
          <Label>Link parcheggio &amp; navetta 1 (opzionale)</Label>
          <input className={inputCls} type="url" value={f.parking_map_url ?? ''}
            onChange={e => set('parking_map_url', e.target.value || null)}
            placeholder="https://maps.google.com/..." />
        </div>
        <div>
          <Label>Link parcheggio &amp; navetta 2 (opzionale)</Label>
          <input className={inputCls} type="url" value={f.parking_map_url_2 ?? ''}
            onChange={e => set('parking_map_url_2', e.target.value || null)}
            placeholder="https://maps.google.com/..." />
        </div>
        <p className="md:col-span-2 -mt-3 text-[10px] text-[#7a4a4a]/50">
          Se compilati, compaiono nell&apos;email di conferma iscrizione lista come link a Google Maps.
        </p>

        {/* Description */}
        <div className="md:col-span-2">
          <Label>Descrizione *</Label>
          <textarea className={`${inputCls} resize-none`} rows={4} value={f.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Descrizione dell'evento per la pagina pubblica..." required />
        </div>

        {/* Event mode — ticket vs list-only */}
        <div className="md:col-span-2">
          <Label>Tipo evento</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                set('is_list_only', false);
              }}
              className={`flex-1 py-3 px-4 rounded-lg border text-[11px] tracking-[0.2em] transition-colors ${
                !f.is_list_only
                  ? 'bg-[#731515] text-white border-[#731515]'
                  : 'bg-[#fdf6f6] text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/40'
              }`}
            >
              🎟 VENDITA BIGLIETTI
            </button>
            <button
              type="button"
              onClick={() => {
                set('is_list_only', true);
                set('guest_list_enabled', true);
              }}
              className={`flex-1 py-3 px-4 rounded-lg border text-[11px] tracking-[0.2em] transition-colors ${
                f.is_list_only
                  ? 'bg-[#731515] text-white border-[#731515]'
                  : 'bg-[#fdf6f6] text-[#7a4a4a] border-[#eddada] hover:border-[#731515]/40'
              }`}
            >
              📋 SOLO LISTA
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
            {f.is_list_only
              ? 'Nessun checkout — gli utenti si iscrivono direttamente alla lista. La lista invitati viene attivata automaticamente. Se c\'è un prezzo, verrà indicato come "pagamento all\'ingresso".'
              : 'Checkout con Stripe. Prezzo obbligatorio per eventi a pagamento.'}
          </p>
        </div>

        {/* Price */}
        <div>
          <Label>Prezzo (€) — 0 = gratuito</Label>
          <input className={inputCls} type="number" min={0} step={1} value={f.price}
            onChange={e => set('price', parseFloat(e.target.value) || 0)} />
          {f.price > 0 && !f.is_list_only && (
            <p className="mt-1 text-[10px] text-[#731515]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
              Prodotto Stripe creato automaticamente al salvataggio
            </p>
          )}
          {f.price > 0 && f.is_list_only && (
            <p className="mt-1 text-[10px] text-[#731515]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
              Mostrato come &ldquo;pagamento all&apos;ingresso&rdquo; sulla pagina pubblica
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

        {/* Image upload */}
        <div className="md:col-span-2">
          <Label>Immagine evento (opzionale)</Label>
          <div className="flex items-start gap-4">
            {/* Preview */}
            {f.image_url && (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-[#eddada] bg-[#fdf6f6]">
                <Image src={f.image_url} alt="Anteprima" fill className="object-cover" sizes="80px" />
                <button type="button" onClick={() => set('image_url', null)}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70 transition-colors">
                  <X size={10} />
                </button>
              </div>
            )}
            <div className="flex flex-col gap-2 flex-1">
              <button type="button" disabled={imgUploading}
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-[#eddada] rounded-lg text-[11px] tracking-[0.2em] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] disabled:opacity-50 transition-colors bg-[#fdf6f6] w-fit">
                {imgUploading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <ImagePlus size={13} />}
                {imgUploading ? 'CARICAMENTO…' : 'CARICA IMMAGINE'}
              </button>
              {f.image_url && (
                <p className="text-[9px] text-[#7a4a4a]/50 truncate max-w-xs" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {f.image_url}
                </p>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) handleImageFile(file); e.target.value = ''; }} />
          </div>
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
          {!f.is_list_only && (
            <Toggle label="Lista invitati attiva" checked={f.guest_list_enabled ?? false} onChange={v => set('guest_list_enabled', v)} />
          )}
          {f.is_list_only && (
            <div className="flex items-center gap-2 text-[11px] text-[#731515]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
              <span className="text-[#731515]">✓</span> Lista invitati attiva automaticamente (Solo lista)
            </div>
          )}
          {!f.is_list_only && f.price > 0 && (
            <Toggle
              label="Programma Referral attivo"
              checked={f.referral_enabled ?? false}
              onChange={v => set('referral_enabled', v)}
            />
          )}
          {!f.is_list_only && f.price > 0 && (f.referral_enabled ?? false) && (
            <p className="text-[10px] text-[#731515]/60 -mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
              Widget condivisione e reward 5 inviti visibile nel checkout
            </p>
          )}
          <Toggle
            label="Iscrizioni chiuse manualmente"
            checked={f.registration_closed ?? false}
            onChange={v => set('registration_closed', v)}
          />
          {(f.registration_closed ?? false) && (
            <p className="text-[10px] text-amber-600 -mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
              Il pubblico vedrà &ldquo;Iscrizioni chiuse&rdquo; — nessun checkout o form disponibile
            </p>
          )}
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
          className="px-5 py-2.5 border border-[#eddada] bg-white text-[#7a4a4a] text-[10px] tracking-[0.3em] hover:border-[#731515]/40 transition-colors rounded-lg"
        >
          ANNULLA
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Collaborator assignment panel
───────────────────────────────────────────── */
interface Collaborator { id: string; email: string; name: string; assigned: boolean; }

function CollaboratorAssignPanel({ event, accessToken }: { event: DbEvent; accessToken: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/collaborator/assign?eventSlug=${event.slug}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(j => setCollaborators(Array.isArray(j.collaborators) ? j.collaborators : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [event.slug, accessToken]);

  async function toggle(c: Collaborator) {
    if (toggling.has(c.id)) return;
    const next = !c.assigned;
    setToggling(p => new Set(p).add(c.id));
    setCollaborators(prev => prev.map(x => x.id === c.id ? { ...x, assigned: next } : x));

    try {
      const res = await fetch('/api/collaborator/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ eventSlug: event.slug, userId: c.id, assigned: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCollaborators(prev => prev.map(x => x.id === c.id ? { ...x, assigned: c.assigned } : x));
    } finally {
      setToggling(p => { const n = new Set(p); n.delete(c.id); return n; });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-[#731515]/40 animate-spin" />
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-[#7a4a4a]/6 flex items-center justify-center mb-3">
          <UserCheck size={20} className="text-[#7a4a4a]/30" strokeWidth={1.5} />
        </div>
        <p className="text-xs text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          Nessun account collaboratore trovato.
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {collaborators.map(c => {
        const isBusy = toggling.has(c.id);
        return (
          <div key={c.id} className="flex items-center gap-3 px-6 py-3.5 border-b border-[#eddada]/50 last:border-0 hover:bg-[#fdf6f6] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                {c.name}
              </div>
              <div className="text-[11px] text-[#7a4a4a]/50 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                {c.email}
              </div>
            </div>
            <button
              onClick={() => toggle(c)}
              disabled={isBusy}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] tracking-[0.25em] transition-all duration-200 ${
                c.assigned
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-[#7a4a4a]/6 text-[#7a4a4a]/60 border border-[#eddada] hover:bg-[#731515]/8 hover:text-[#731515]'
              } ${isBusy ? 'opacity-50' : ''}`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {isBusy
                ? <Loader2 size={11} className="animate-spin" />
                : c.assigned
                  ? <><Check size={11} strokeWidth={2.5} /> ASSEGNATO</>
                  : <>ASSEGNA</>
              }
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Guest List — schermo intero
───────────────────────────────────────────── */
const DRAWER_TABS = [
  { id: 'guests'        as const, icon: ClipboardList, label: 'INVITATI',      short: 'INVITATI' },
  { id: 'collaborators' as const, icon: UserCheck,     label: 'COLLABORATORI', short: 'COLLAB.'  },
  { id: 'partners'      as const, icon: Link2,         label: 'PARTNER',       short: 'PARTNER'  },
];

function GuestListDrawer({
  event,
  accessToken,
  onClose,
  onGuestEnabled,
}: {
  event:          DbEvent;
  accessToken:    string;
  onClose:        () => void;
  onGuestEnabled: () => void;
}) {
  const [tab, setTab] = useState<'guests' | 'collaborators' | 'partners'>('guests');
  // Single stable scroll container — never remounted across tab changes.
  // This prevents iOS Safari from losing its touch-scroll tracking.
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Change tab and reset scroll position without remounting the container
  function changeTab(t: typeof tab) {
    setTab(t);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, y: 16 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#eddada] bg-white shrink-0">
        <div className="min-w-0">
          <div className="text-[9px] tracking-[0.45em] text-[#731515] mb-0.5">LISTA INVITATI</div>
          <h2
            className="text-lg sm:text-xl font-light text-[#1a0505] truncate"
            style={{ fontFamily: 'var(--font-syne)' }}
            title={event.title}
          >
            {event.title}
          </h2>
          <p className="text-[11px] text-[#7a4a4a]/50 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {event.date ? fmtDate(event.date) : ''}{event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 ml-3 w-11 h-11 flex items-center justify-center rounded-xl text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
          title="Chiudi (Esc)"
          style={{ touchAction: 'manipulation' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Tabs — 3-column grid so each tab is perfectly centred in its cell ── */}
      <div className="grid grid-cols-3 border-b border-[#eddada] bg-white shrink-0">
        {DRAWER_TABS.map(({ id, icon: Icon, label, short }) => (
          <button
            key={id}
            onClick={() => changeTab(id)}
            className={`flex items-center justify-center gap-1.5 py-3.5 text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.3em] border-b-2 transition-colors ${
              tab === id
                ? 'border-[#731515] text-[#731515]'
                : 'border-transparent text-[#7a4a4a]/40 hover:text-[#7a4a4a]'
            }`}
            style={{ fontFamily: 'var(--font-nunito)', touchAction: 'manipulation' }}
          >
            <Icon size={11} className="shrink-0" />
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Single stable scroll container — ALL tab content lives here ──
           Never remounted: prevents iOS from losing touch-scroll tracking.
           EventGuestPanel uses sticky positioning for its search header. ── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0"
        style={{
          overflowY:                'auto',
          WebkitOverflowScrolling:  'touch',
          overscrollBehavior:       'contain',
        }}
      >
        {tab === 'guests' && (
          <EventGuestPanel
            event={{
              id:                 event.id,
              slug:               event.slug,
              title:              event.title,
              guest_list_enabled: event.guest_list_enabled,
            }}
            accessToken={accessToken}
            onGuestEnabled={onGuestEnabled}
          />
        )}
        {tab === 'collaborators' && (
          <CollaboratorAssignPanel event={event} accessToken={accessToken} />
        )}
        {tab === 'partners' && (
          <EventPartnerPanel
            event={{ id: event.id, slug: event.slug, title: event.title }}
            accessToken={accessToken}
          />
        )}
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
  onInvite,
  onGuestList,
  guestListActive,
  isPast = false,
}: {
  event: DbEvent;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onScan: () => void;
  onInvite: () => void;
  onGuestList: () => void;
  guestListActive: boolean;
  isPast?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  // Shared action buttons — rendered once on desktop (inline), once on mobile (bottom bar)
  const actionButtons = (compact = false) => {
    const sz  = compact ? 15 : 14;
    const cls = compact ? 'p-2.5' : 'p-2';
    return (
      <>
        {!isPast && (
          <button onClick={onScan} title="Event Scanner"
            className={`${cls} rounded-lg text-[#7a4a4a]/60 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors`}>
            <ScanLine size={sz} />
          </button>
        )}
        {!isPast && (
          <button onClick={onInvite} title="Invita clienti CRM"
            className={`${cls} rounded-lg text-[#7a4a4a]/60 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors`}>
            <Send size={sz} />
          </button>
        )}
        <button
          onClick={onGuestList}
          title="Lista invitati"
          className={`${cls} rounded-lg transition-colors ${
            guestListActive
              ? 'text-[#731515] bg-[#f5e8e8]'
              : event.guest_list_enabled
                ? 'text-[#731515] bg-[#fdf6f6] hover:bg-[#f5e8e8]'
                : 'text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-[#fdf6f6]'
          }`}
        >
          <ClipboardList size={sz} />
        </button>
        <button onClick={onTogglePublished} title={event.published ? 'Nascondi' : 'Pubblica'}
          className={`${cls} rounded-lg transition-colors ${
            event.published ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}>
          {event.published ? <Eye size={sz} /> : <EyeOff size={sz} />}
        </button>
        {!isPast && (
          <button onClick={onEdit}
            className={`${cls} rounded-lg text-[#7a4a4a] hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors`}>
            <Pencil size={sz} />
          </button>
        )}
        {delConfirm ? (
          <div className="flex items-center gap-1">
            <button onClick={onDelete}
              className="px-2.5 py-1.5 rounded bg-red-600 text-white text-[9px] tracking-wide hover:bg-red-700 transition-colors">
              ELIMINA
            </button>
            <button onClick={() => setDelConfirm(false)}
              className="px-2.5 py-1.5 rounded border border-[#eddada] text-[9px] text-[#7a4a4a] hover:bg-[#fdf6f6] transition-colors">
              NO
            </button>
          </div>
        ) : (
          <button onClick={() => setDelConfirm(true)}
            className={`${cls} rounded-lg text-[#7a4a4a]/50 hover:text-red-600 hover:bg-red-50 transition-colors`}>
            <Trash2 size={sz} />
          </button>
        )}
        <button onClick={() => setExpanded(x => !x)}
          className={`${cls} rounded-lg text-[#7a4a4a]/50 hover:text-[#1a0505] hover:bg-[#fdf6f6] transition-colors`}>
          {expanded ? <ChevronUp size={sz} /> : <ChevronDown size={sz} />}
        </button>
      </>
    );
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${
      isPast
        ? 'bg-[#f8f5f5] border-[#e8dada] shadow-none'
        : 'bg-white border-[#eddada] shadow-[0_1px_4px_rgba(107,26,26,0.05)]'
    }`}>
      {/* Main row — date + info + desktop actions */}
      <div className="flex items-center gap-3 p-4">

        {/* Date badge */}
        <div className="w-11 shrink-0 text-center">
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
            <span className={`text-[8px] tracking-[0.35em] ${isPast ? 'text-[#7a4a4a]/40' : 'text-[#7a4a4a]/60'}`}>{event.type}</span>
            {isPast
              ? <span className="inline-block text-[8px] tracking-[0.3em] border px-2 py-0.5 rounded-full bg-[#f5f0f0] text-[#9a7070] border-[#e8d5d5]">PASSATO</span>
              : <StatusPill status={event.status} />
            }
            {event.price > 0 && (
              <span className="inline-flex items-center gap-1 text-[8px] tracking-[0.2em] bg-[#fde8e8] text-[#731515] px-2 py-0.5 rounded-full border border-[#731515]/15">
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
            className={`text-[15px] font-medium mt-0.5 truncate ${isPast ? 'text-[#7a4a4a]' : 'text-[#1a0505]'} ${event.title_strikethrough ? 'line-through decoration-[#731515]/50' : ''}`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.title}
          </div>
          <div className={`flex items-center gap-1 mt-0.5 text-[11px] ${isPast ? 'text-[#7a4a4a]/40' : 'text-[#7a4a4a]/60'}`}>
            <MapPin size={9} className={`${isPast ? 'text-[#7a4a4a]/30' : 'text-[#731515]/50'} shrink-0`} />
            <span className="truncate" style={{ fontFamily: 'var(--font-nunito)' }}>{event.location}</span>
          </div>
        </div>

        {/* Desktop actions — hidden on small screens */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {actionButtons(false)}
        </div>
      </div>

      {/* Mobile action bar — visible only on small screens */}
      <div className="flex sm:hidden items-center justify-around border-t border-[#f0e4e4] px-2 py-1">
        {actionButtons(true)}
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
              {event.image_url && (
                <div className="flex items-center gap-3">
                  <span className="text-[#731515] font-medium shrink-0">Immagine:</span>
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#eddada] shrink-0">
                    <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="56px" />
                  </div>
                  <span className="text-[10px] text-[#7a4a4a]/50 truncate max-w-[180px]">{event.image_url}</span>
                </div>
              )}
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
  const [tab,         setTab]         = useState<'active' | 'past'>('active');
  const [scannerEvent,    setScannerEvent]    = useState<DbEvent | null>(null);
  const [inviteEvent,     setInviteEvent]     = useState<DbEvent | null>(null);
  const [guestListEventId, setGuestListEventId] = useState<string | null>(null);
  const [accessToken,     setAccessToken]     = useState<string | null>(null);

  useMobileOverlay(!!scannerEvent, () => setScannerEvent(null));
  // EventEmailModalAdvanced already locks scroll on its own — only add back-close here.
  useOverlayBackClose(!!inviteEvent, () => setInviteEvent(null));
  useMobileOverlay(!!guestListEventId, () => setGuestListEventId(null));
  const [customCats,      setCustomCats]      = useState<CustomCategoryInfo[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
    // Keep the token in sync with Supabase's background auto-refresh —
    // without this, a stale mount-time token can outlive its validity and
    // every authenticated call below starts failing with 401.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch custom CRM categories for the invite modal
  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/crm/categories', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(j => setCustomCats(Array.isArray(j.categories) ? j.categories : []))
      .catch(() => {});
  }, [accessToken]);

  // Scroll the form into view whenever edit/create mode opens
  useEffect(() => {
    if (mode !== 'list') {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [mode]);

  const load = () => {
    setLoading(true);
    fetch('/api/events/all')
      .then(r => r.json())
      .then(j => setEvents(Array.isArray(j.events) ? j.events : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Keep a ref so the Realtime handler always calls the latest load()
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(load, []);

  // ── Realtime: re-fetch when another session changes events ────────────────
  useEffect(() => {
    if (!accessToken) return;
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel('events_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        loadRef.current();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accessToken]);

  /* ── Active / Past split ── */
  const today      = new Date().toISOString().slice(0, 10);
  const activeEvts = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pastEvts   = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const tabEvents  = tab === 'active' ? activeEvts : pastEvts;

  /* ── Guest list drawer — derive from events so it auto-updates on reload ── */
  const guestListEvent = guestListEventId
    ? (events.find(e => e.id === guestListEventId) ?? null)
    : null;

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

      // Re-fetch the session right before the call — the token snapshotted on
      // mount can expire if the form stays open longer than the JWT's lifetime.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? accessToken;

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? accessToken;
      await fetch(`/api/events/${slug}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch (err) {
      console.error('[EventManager delete]', err);
    }
  }

  /* ── Toggle published ── */
  async function handleToggle(event: DbEvent) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? accessToken;
      await fetch(`/api/events/${event.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ published: !event.published }),
      });
      load();
    } catch (err) {
      console.error('[EventManager toggle]', err);
    }
  }

  /* ── Header ── */
  return (
    <div ref={topRef}>
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

      {/* Invite modal — shared EventEmailModalAdvanced with event pre-filled */}
      <AnimatePresence>
        {inviteEvent && accessToken && (
          <EventEmailModalAdvanced
            key="invite"
            accessToken={accessToken}
            customCategories={customCats}
            prefillEvent={inviteEvent}
            onClose={() => setInviteEvent(null)}
          />
        )}
      </AnimatePresence>

      {/* Guest list drawer */}
      <AnimatePresence>
        {guestListEvent && accessToken && (
          <GuestListDrawer
            key={guestListEvent.id}
            event={guestListEvent}
            accessToken={accessToken}
            onClose={() => setGuestListEventId(null)}
            onGuestEnabled={load}
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

        {mode === 'list' && tab === 'active' && (
          <button
            onClick={() => { setFormErr(''); setMode('create'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] transition-colors rounded-lg"
          >
            <Plus size={13} />
            NUOVO EVENTO
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 p-1 bg-[#fdf6f6] border border-[#eddada] rounded-xl w-fit">
        {([['active', 'Eventi Attivi', activeEvts.length], ['past', 'Past Events', pastEvts.length]] as const).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (mode !== 'list') setMode('list'); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] tracking-[0.3em] transition-all duration-200 ${
              tab === id
                ? 'bg-[#731515] text-white shadow-sm'
                : 'text-[#7a4a4a] hover:bg-[#eddada]/60'
            }`}
          >
            {label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
              tab === id ? 'bg-white/20 text-white' : 'bg-[#eddada] text-[#7a4a4a]'
            }`}>
              {count}
            </span>
          </button>
        ))}
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

      {/* Form (create / edit) — only for active tab */}
      <AnimatePresence>
        {mode !== 'list' && tab === 'active' && (
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
                  guest_list_enabled:   mode.edit.guest_list_enabled ?? false,
                  is_list_only:         mode.edit.is_list_only ?? false,
                  referral_enabled:     mode.edit.referral_enabled ?? false,
                  registration_closed:  mode.edit.registration_closed ?? false,
                  image_url:           mode.edit.image_url,
                  location_map_url:    mode.edit.location_map_url ?? null,
                  parking_map_url:     mode.edit.parking_map_url ?? null,
                  parking_map_url_2:   mode.edit.parking_map_url_2 ?? null,
                  sort_order:         mode.edit.sort_order,
                  section:            mode.edit.section ?? 'general',
                }
              : BLANK
            }
            onSave={handleSave}
            onCancel={() => { setMode('list'); setFormErr(''); }}
            saving={saving}
            error={formErr}
            token={accessToken}
          />
        )}
      </AnimatePresence>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : tabEvents.length === 0 ? (
        <div className="text-center py-16 text-[#7a4a4a]/50 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
          <CalendarDays size={32} className="mx-auto mb-3 text-[#eddada]" />
          {tab === 'active'
            ? 'Nessun evento attivo. Crea il primo evento con il pulsante qui sopra.'
            : 'Nessun evento passato.'}
        </div>
      ) : (
        <div className={`space-y-3 ${tab === 'past' ? 'opacity-80' : ''}`}>
          {tabEvents.map(event => (
            <EventRow
              key={event.id || event.slug}
              event={event}
              onEdit={tab === 'past' ? () => {} : () => { setFormErr(''); setMode({ edit: event }); }}
              onDelete={() => handleDelete(event.slug)}
              onTogglePublished={() => handleToggle(event)}
              onScan={tab === 'past' ? () => {} : () => setScannerEvent(event)}
              onInvite={tab === 'past' ? () => {} : () => setInviteEvent(event)}
              onGuestList={() => setGuestListEventId(id => id === event.id ? null : event.id)}
              guestListActive={guestListEvent?.id === event.id}
              isPast={tab === 'past'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
