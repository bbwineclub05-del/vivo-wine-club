'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ActionButton, DataList, EmptyState, FilterPills, NewButton, PageHead,
  SearchField, Sheet, StatusPill as Pill, Toolbar, fieldClass, type Column,
} from '@/components/admin/ui';
import EventScanner from '@/components/EventScanner';
import EventGuestPanel from '@/components/EventGuestPanel';
import EventTicketsPanel from '@/components/EventTicketsPanel';
import EventPartnerPanel from '@/components/EventPartnerPanel';
import EventInvite, { type CustomCategoryInfo } from '@/components/admin/EventInvite';
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
  date_month_only: boolean;
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
  members_only: boolean;
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
  title: '', type: 'WINERY VISIT', section: 'winery_visit', date: '', date_month_only: false,
  time: '',
  location: '', location_full: '', description: '',
  price: 0, capacity: null, status: 'open',
  published: false, title_strikethrough: false, guest_list_enabled: false,
  is_list_only: false, referral_enabled: false, registration_closed: false,
  members_only: false,
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
/** «5 nov 2026», come la scrive chi legge il calendario. */
function fmtDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${parseInt(d)} ${mesi[parseInt(m) - 1]} ${y}`;
}

/** Il mese per esteso, come lo legge chi guarda il sito. */
function fmtMese(iso: string) {
  if (!iso) return '—';
  const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const [y, m] = iso.split('-');
  return `${mesi[parseInt(m) - 1] ?? ''} ${y}`;
}

/** La data come la vede il pubblico: col giorno, o solo il mese. */
function fmtQuando(e: { date: string; date_month_only?: boolean }) {
  if (!e.date) return '—';
  return e.date_month_only ? fmtMese(e.date) : fmtDate(e.date);
}

/** Lo stato dell'evento, in italiano e nei toni dell'area. */
function StatusPill({ status }: { status: DbEvent['status'] }) {
  const map: Record<DbEvent['status'], { label: string; tone: 'good' | 'warn' | 'off' | 'neutral' }> = {
    open:      { label: 'prenotabile',  tone: 'good' },
    soldout:   { label: 'tutto esaurito', tone: 'neutral' },
    soon:      { label: 'in arrivo',    tone: 'warn' },
    completed: { label: 'concluso',     tone: 'off' },
  };
  const { label, tone } = map[status] ?? map.open;
  return <Pill tone={tone}>{label}</Pill>;
}

/* ─────────────────────────────────────────────
   Input helpers
───────────────────────────────────────────── */
const inputCls = fieldClass;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-fine font-medium text-on-paper">
      {children}
    </label>
  );
}

/** A titled band inside the form, so twenty-two fields read as five groups. */
function FormGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule-paper pt-6 first:border-0 first:pt-0">
      <h4 className="ds-display text-[17px] tracking-[-0.02em]">{title}</h4>
      {hint && <p className="mt-1.5 text-fine text-on-paper-muted">{hint}</p>}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Toggle({
  label, checked, onChange, hint,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex w-full min-h-[56px] items-center gap-4 rounded-2xl px-1 text-left transition-colors hover:bg-paper-soft"
    >
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-rule-paper'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-paper shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-body">{label}</span>
        {hint && <span className="mt-0.5 block text-fine text-on-paper-muted">{hint}</span>}
      </span>
    </button>
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
      className="mb-6 rounded-2xl border border-rule-paper bg-paper p-5 md:p-7"
    >
      <h3 className="ds-display mb-7 text-[22px] tracking-[-0.025em] text-on-paper">
        {initial.title ? 'Modifica evento' : 'Nuovo evento'}
      </h3>

      <div className="space-y-8">

      <FormGroup title="L’evento">

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
          <p className="mt-1 text-fine text-on-paper-muted">
            Determina in quale pagina experience appare l&apos;evento.
          </p>
        </div>

        {/* Status */}
        <div>
          <Label>Stato</Label>
          <select className={inputCls} value={f.status}
            onChange={e => set('status', e.target.value as FormData['status'])}>
            <option value="open">Open, prenotabile</option>
            <option value="soldout">Sold Out</option>
            <option value="soon">Coming Soon</option>
            <option value="completed">Completato</option>
          </select>
        </div>

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
          {/* Two states of one decision, so each one carries its own
              consequence instead of a shared note underneath. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                listOnly: false,
                title: 'Vendita biglietti',
                hint: 'Checkout con Stripe. Il prezzo è obbligatorio per gli eventi a pagamento.',
              },
              {
                listOnly: true,
                title: 'Solo lista',
                hint: 'Nessun checkout: ci si iscrive e basta. La lista invitati si attiva da sola, e un eventuale prezzo diventa «pagamento all’ingresso».',
              },
            ] as const).map((opt) => {
              const active = f.is_list_only === opt.listOnly;
              return (
                <button
                  key={opt.title}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    set('is_list_only', opt.listOnly);
                    if (opt.listOnly) set('guest_list_enabled', true);
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    active
                      ? 'border-accent bg-accent text-paper'
                      : 'border-rule-paper bg-paper hover:border-accent/40'
                  }`}
                >
                  <span className="block text-body font-medium">{opt.title}</span>
                  <span className={`mt-1 block text-fine ${active ? 'text-paper/75' : 'text-on-paper-muted'}`}>
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </FormGroup>

      <FormGroup title="Quando e dove" hint="Data, orario e indirizzi. I link alle mappe finiscono nell’email di conferma.">

        {/* Date */}
        <div>
          <Label>Data *</Label>
          <input className={inputCls} type="date" value={f.date}
            onChange={e => set('date', e.target.value)} required />
          {/* Il giorno serve comunque: ordina il calendario e dice cos'è
              passato. Questa spunta decide solo cosa legge il pubblico. */}
          <label className="mt-2.5 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 accent-[#731515]"
              checked={f.date_month_only ?? false}
              onChange={e => set('date_month_only', e.target.checked)}
            />
            <span className="text-[13px] leading-snug text-[#7A5252]">
              Del giorno non sono sicuro: mostra solo il mese
              <span className="block text-[12px] text-[#7A5252]/70">
                In pagina si legge «{f.date ? fmtMese(f.date) : 'Dicembre 2026'}». Metti comunque
                una data qui sopra — meglio il primo del mese — perché serve a ordinare il
                calendario. L’evento resta fra i prossimi fino a fine mese.
              </span>
            </span>
          </label>
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
            placeholder="Ca' del Bosco, Erbusco, ore 11:00" required />
        </div>

        {/* Location map link */}
        <div className="md:col-span-2">
          <Label>Link mappa location (opzionale)</Label>
          <input className={inputCls} type="url" value={f.location_map_url ?? ''}
            onChange={e => set('location_map_url', e.target.value || null)}
            placeholder="https://maps.google.com/..." />
          <p className="mt-1 text-fine text-on-paper-muted">
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
        <p className="md:col-span-2 -mt-3 text-fine text-on-paper-muted">
          Se compilati, compaiono nell&apos;email di conferma iscrizione lista come link a Google Maps.
        </p>

      </FormGroup>

      <FormGroup title="Biglietti e posti">

        {/* Price */}
        <div>
          <Label>Prezzo (€), 0 = gratuito</Label>
          <input className={inputCls} type="number" min={0} step={1} value={f.price}
            onChange={e => set('price', parseFloat(e.target.value) || 0)} />
          {f.price > 0 && !f.is_list_only && (
            <p className="mt-1 text-fine text-accent">
              Prodotto Stripe creato automaticamente al salvataggio
            </p>
          )}
          {f.price > 0 && f.is_list_only && (
            <p className="mt-1 text-fine text-accent">
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

        {/* Immagine: il cestino è un pulsante vero, non un quadratino
            da cinque pixel che compare al passaggio del mouse. */}
        <div className="md:col-span-2">
          <Label>Immagine dell’evento</Label>
          <div className="flex flex-wrap items-center gap-4">
            {f.image_url && (
              <div className="relative shrink-0">
                <Image
                  src={f.image_url}
                  alt="Anteprima"
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-2xl border border-rule-paper object-cover"
                />
                <button
                  type="button"
                  aria-label="Togli l’immagine"
                  onClick={() => set('image_url', null)}
                  className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full border border-rule-paper bg-paper transition-colors hover:border-accent hover:text-accent"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
            )}
            <ActionButton
              variant="quiet"
              onClick={() => fileRef.current?.click()}
              disabled={imgUploading}
            >
              {imgUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} strokeWidth={1.8} />}
              {imgUploading ? 'Carico…' : f.image_url ? 'Cambia immagine' : 'Carica immagine'}
            </ActionButton>
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

      </FormGroup>

      <FormGroup title="Visibilità e iscrizioni">
        <div className="flex flex-col gap-1 md:col-span-2">
          <Toggle
            label="Pubblicato sul sito"
            hint="Finché è spento, l’evento non compare nel calendario pubblico."
            checked={f.published}
            onChange={v => set('published', v)}
          />
          <Toggle
            label="Titolo barrato"
            hint="Mostra il titolo sbarrato, per una data annullata o spostata."
            checked={f.title_strikethrough}
            onChange={v => set('title_strikethrough', v)}
          />
          {!f.is_list_only && (
            <Toggle
              label="Lista invitati attiva"
              hint="Chi riceve il link può iscriversi senza pagare."
              checked={f.guest_list_enabled ?? false}
              onChange={v => set('guest_list_enabled', v)}
            />
          )}
          {f.is_list_only && (
            <div className="flex items-center gap-2 text-fine text-accent">
              <span className="text-accent">✓</span> Lista invitati attiva automaticamente (Solo lista)
            </div>
          )}
          {!f.is_list_only && f.price > 0 && (
            <Toggle
              label="Programma referral attivo"
              hint="Chi porta cinque amici riceve il premio. Widget visibile al checkout."
              checked={f.referral_enabled ?? false}
              onChange={v => set('referral_enabled', v)}
            />
          )}
          <Toggle
            label="Solo soci"
            hint="Il calendario mostra la targhetta «Solo soci» accanto al pulsante."
            checked={f.members_only ?? false}
            onChange={v => set('members_only', v)}
          />
          <Toggle
            label="Iscrizioni chiuse"
            hint="Il pubblico vede «Iscrizioni chiuse»: niente checkout, niente form."
            checked={f.registration_closed ?? false}
            onChange={v => set('registration_closed', v)}
          />
        </div>
      </FormGroup>

      </div>

      {error && (
        <p role="alert" className="mt-6 text-body text-accent">{error}</p>
      )}

      {/* Sticky on a phone, so Salva is reachable without scrolling back
          up through twenty-two fields. */}
      <div
        className="sticky bottom-0 -mx-5 mt-8 flex gap-3 border-t border-rule-paper bg-paper px-5 pt-4 md:-mx-7 md:px-7"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <ActionButton variant="quiet" onClick={onCancel} className="flex-1 md:flex-none">
          Annulla
        </ActionButton>
        <ActionButton
          onClick={() => onSave(f)}
          disabled={saving || !f.title || !f.date || !f.location || !f.description}
          className="flex-1 md:flex-none"
        >
          {saving ? 'Salvataggio…' : 'Salva evento'}
        </ActionButton>
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
      <div className="flex justify-center py-16">
        <Loader2 size={22} className="animate-spin text-accent/50" />
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <EmptyState title="Nessun collaboratore" body="Non ci sono account collaboratore da assegnare." />
      </div>
    );
  }

  return (
    <ul>
      {collaborators.map((c) => {
        const attesa = toggling.has(c.id);
        return (
          <li
            key={c.id}
            className="flex items-center gap-3 border-b border-rule-paper px-4 py-3.5 last:border-0 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium">{c.name}</p>
              <p className="mt-0.5 truncate text-fine text-on-paper-muted">{c.email}</p>
            </div>
            <ActionButton
              variant={c.assigned ? 'accent' : 'quiet'}
              onClick={() => toggle(c)}
              disabled={attesa}
            >
              {attesa ? <Loader2 size={15} className="animate-spin" /> : c.assigned ? <Check size={15} strokeWidth={2.4} /> : null}
              {c.assigned ? 'Assegnato' : 'Assegna'}
            </ActionButton>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────────────────────
   Guest List a schermo intero
───────────────────────────────────────────── */
const DRAWER_TABS = [
  { id: 'tickets' as const,       label: 'Biglietti',     short: 'Biglietti' },
  { id: 'guests' as const,        label: 'Invitati',      short: 'Invitati' },
  { id: 'collaborators' as const, label: 'Collaboratori', short: 'Collab.' },
  { id: 'partners' as const,      label: 'Partner',       short: 'Partner' },
];

function GuestListDrawer({
  event,
  accessToken,
  isPast,
  onClose,
  onGuestEnabled,
}: {
  event:          DbEvent;
  accessToken:    string;
  isPast:         boolean;
  onClose:        () => void;
  onGuestEnabled: () => void;
}) {
  // Si apre sui biglietti: di un evento a pagamento e' la domanda
  // che ci si fa per prima, e dopo la serata e' l'unica che resta.
  const [tab, setTab] = useState<'tickets' | 'guests' | 'collaborators' | 'partners'>('tickets');
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
      className="ds fixed inset-0 z-[70] flex flex-col overflow-hidden bg-paper text-on-paper"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, y: 16 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Header ──
           The eyebrow is gone: the event title and the tabs below say
           what this is. The close button sits on the left, where a
           thumb reaches it on a phone held one-handed. */}
      <div
        className="flex shrink-0 items-center gap-3 border-b border-rule-paper bg-paper px-4 py-3 sm:px-6"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <button
          onClick={onClose}
          aria-label="Chiudi"
          title="Chiudi (Esc)"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-on-paper transition-colors hover:bg-paper-soft"
          style={{ touchAction: 'manipulation' }}
        >
          <X size={21} strokeWidth={1.8} />
        </button>

        <div className="min-w-0 flex-1">
          <h2
            className="ds-display truncate text-[19px] tracking-[-0.02em] text-on-paper"
            title={event.title}
          >
            {event.title}
          </h2>
          <p className="mt-0.5 truncate text-fine text-on-paper-muted">
            {fmtQuando(event)}{event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
      </div>

      {/* ── Tabs — 3-column grid so each tab is perfectly centred in its cell ── */}
      <div className="shrink-0 border-b border-rule-paper bg-paper px-4 pb-3 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {DRAWER_TABS.map(({ id, label, short }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              aria-pressed={tab === id}
              className={`min-h-[44px] min-w-[5.5rem] flex-1 rounded-full border px-3 text-fine font-medium transition-colors ${
                tab === id
                  ? 'border-accent bg-accent text-paper'
                  : 'border-rule-paper text-on-paper hover:border-accent/40'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
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
        {tab === 'tickets' && (
          <EventTicketsPanel event={{ slug: event.slug }} accessToken={accessToken} isPast={isPast} />
        )}
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
/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */

/**
 * What you can do to an event.
 *
 * These six actions used to sit as six small buttons inside every row,
 * which on a phone meant six targets a few pixels apart. Tapping the row
 * opens them as a list instead: each one is a full-width line you cannot
 * miss, and the destructive one sits apart at the bottom.
 */
function EventActions({
  event, isPast, onClose, onEdit, onGuestList, onInvite, onScan, onTogglePublished, onDelete,
}: {
  event: DbEvent | null;
  isPast: boolean;
  onClose: () => void;
  onEdit: () => void;
  onGuestList: () => void;
  onInvite: () => void;
  onScan: () => void;
  onTogglePublished: () => void;
  onDelete: () => void;
}) {
  if (!event) return null;

  const rows: { label: string; hint?: string; run: () => void; hidden?: boolean }[] = [
    { label: 'Modifica evento', hint: 'Data, luogo, prezzo, capienza', run: onEdit, hidden: isPast },
    { label: 'Chi viene', hint: 'Biglietti venduti, iscritti alla lista, partner', run: onGuestList },
    { label: 'Invita', hint: 'Manda l’email a una lista di contatti', run: onInvite, hidden: isPast },
    { label: 'Scanner', hint: 'Controlla i biglietti all’ingresso', run: onScan, hidden: isPast },
    // Lo scanner resta solo per gli eventi futuri: a serata finita
    // non c'e' piu' niente da scansionare, e chi e' venuto si legge
    // in «Chi viene», che resta aperta anche dopo.
    {
      label: event.published ? 'Nascondi dal sito' : 'Pubblica sul sito',
      hint: event.published ? 'Smette di comparire nel calendario' : 'Compare subito nel calendario pubblico',
      run: onTogglePublished,
    },
  ];

  return (
    <Sheet open={!!event} title={event.title} onClose={onClose}>
      <ul className="space-y-1">
        {rows.filter((r) => !r.hidden).map((r) => (
          <li key={r.label}>
            <button
              onClick={() => { r.run(); onClose(); }}
              className="w-full rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-paper-soft"
            >
              <span className="block text-body font-medium text-on-paper">{r.label}</span>
              {r.hint && <span className="mt-0.5 block text-fine text-on-paper-muted">{r.hint}</span>}
            </button>
          </li>
        ))}
      </ul>

      {!isPast && (
        <>
          <div className="my-4 h-px bg-rule-paper" />
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full rounded-2xl px-4 py-3.5 text-left text-body font-medium text-accent transition-colors hover:bg-accent/5"
          >
            Elimina evento
          </button>
        </>
      )}
    </Sheet>
  );
}

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
  const [actionsEvent,    setActionsEvent]    = useState<DbEvent | null>(null);
  const [query,           setQuery]           = useState('');
  const [accessToken,     setAccessToken]     = useState<string | null>(null);

  useMobileOverlay(!!scannerEvent, () => setScannerEvent(null));
  // EventInvite blocca lo scorrimento da sé: qui serve solo la chiusura col tasto indietro.
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

  /* ── What the list actually shows ── */
  const shownEvents = query.trim()
    ? tabEvents.filter((e) =>
        `${e.title} ${e.location_full ?? ''} ${e.location ?? ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : tabEvents;

  /* The columns are declared once and the list decides how to draw them:
     a table on a desktop, a stack of cards on a phone. */
  const eventColumns: Column<DbEvent>[] = [
    {
      key: 'title',
      label: 'Evento',
      primary: true,
      render: (e) => (
        <span className={e.title_strikethrough ? 'line-through decoration-accent/60' : ''}>
          {e.title}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'Data',
      render: (e) => (
        <span className="ds-numeric">
          {fmtQuando(e)}
          {e.time ? ` · ${e.time}` : ''}
        </span>
      ),
    },
    {
      key: 'place',
      label: 'Luogo',
      desktopOnly: true,
      render: (e) => <span className="text-on-paper-muted">{e.location_full || e.location || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Stato',
      align: 'right',
      render: (e) => <StatusPill status={e.status} />,
    },
    {
      key: 'published',
      label: 'Sul sito',
      align: 'right',
      // The single most consequential flag on this screen: an event that
      // is not published simply does not exist for anyone outside.
      render: (e) =>
        e.published
          ? <Pill tone="good">pubblicato</Pill>
          : <Pill tone="warn">non pubblicato</Pill>,
    },
  ];

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

      {/* Invito, con l'evento già compilato. */}
      <AnimatePresence>
        {inviteEvent && accessToken && (
          <EventInvite
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
            isPast={guestListEvent.date < new Date().toISOString().slice(0, 10)}
            onClose={() => setGuestListEventId(null)}
            onGuestEnabled={load}
          />
        )}
      </AnimatePresence>

      <EventActions
        event={actionsEvent}
        isPast={tab === 'past'}
        onClose={() => setActionsEvent(null)}
        onEdit={() => { setFormErr(''); setMode({ edit: actionsEvent! }); }}
        onGuestList={() => setGuestListEventId(actionsEvent!.id)}
        onInvite={() => setInviteEvent(actionsEvent)}
        onScan={() => setScannerEvent(actionsEvent)}
        onTogglePublished={() => handleToggle(actionsEvent!)}
        onDelete={() => handleDelete(actionsEvent!.slug)}
      />

      <PageHead
        title="Eventi"
        subtitle={
          /* One quiet line instead of three metric cards: the number
             that matters here is how many are actually visible on the
             site, and it deserves a sentence, not a dashboard. */
          `${total} eventi · ${published} pubblicati sul sito · ${open} prenotabili`
        }
        action={
          mode === 'list' && tab === 'active'
            ? <NewButton label="Nuovo evento" onClick={() => { setFormErr(''); setMode('create'); }} />
            : undefined
        }
      />

      <Toolbar>
        <SearchField value={query} onChange={setQuery} placeholder="Cerca per titolo o luogo" />
        <FilterPills
          value={tab}
          onChange={(v) => { setTab(v); if (mode !== 'list') setMode('list'); }}
          options={[
            { value: 'active' as const, label: 'In programma', count: activeEvts.length },
            { value: 'past' as const,   label: 'Passati',      count: pastEvts.length },
          ]}
        />
      </Toolbar>

      {/* Form (create / edit) — only for the active tab */}
      <AnimatePresence>
        {mode !== 'list' && tab === 'active' && (
          <EventForm
            key="form"
            initial={typeof mode === 'object' && 'edit' in mode
              ? {
                  title:              mode.edit.title,
                  type:               mode.edit.type,
                  date:               mode.edit.date,
                  date_month_only:    mode.edit.date_month_only ?? false,
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
                  members_only:         mode.edit.members_only ?? false,
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <DataList
          items={shownEvents}
          getKey={(e) => e.id || e.slug}
          onRowClick={(e) => setActionsEvent(e)}
          columns={eventColumns}
          empty={
            <EmptyState
              title={query ? 'Nessun risultato' : tab === 'active' ? 'Nessun evento in programma' : 'Nessun evento passato'}
              body={
                query
                  ? 'Prova a cercare altro, o cambia filtro.'
                  : tab === 'active'
                    ? 'Crea il primo evento e comparirà qui.'
                    : undefined
              }
              action={
                query
                  ? <ActionButton variant="quiet" onClick={() => setQuery('')}>Azzera la ricerca</ActionButton>
                  : tab === 'active'
                    ? <NewButton label="Nuovo evento" onClick={() => { setFormErr(''); setMode('create'); }} />
                    : undefined
              }
            />
          }
        />
      )}
    </div>
  );
}
