'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Search, ShieldCheck, X } from 'lucide-react';
import { ActionButton, Field, Sheet, TextArea, TextInput } from '@/components/admin/ui';
import { mailable, prettifySlug } from '@/lib/crm';

/**
 * Invita a un evento.
 *
 * La versione precedente chiedeva otto decisioni prima di poter
 * scrivere una riga: quali delle sei rubriche, quali eventi passati, se
 * combinarli in OR o in AND, un filtro per livello, una ricerca, e poi
 * una casella da spuntare per ogni singolo contatto. L'algebra booleana
 * su un telefono non la usa nessuno.
 *
 * Qui le decisioni sono quattro, in due passi: *a chi* e *cosa*. Il
 * numero dei destinatari sta sempre sotto gli occhi e cambia mentre si
 * stringe, e il pulsante finale dice quante persone riceveranno la
 * mail invece di dire "Invia".
 *
 * Il filtro per evento non interroga più l'API evento per evento con
 * una cache da tenere aggiornata: la rubrica porta già con sé a quali
 * eventi ciascuno è stato.
 */

export interface CustomCategoryInfo {
  id: string;
  name: string;
}

export interface PrefillEvent {
  slug: string;
  title: string;
  date?: string;
  time?: string | null;
  location?: string;
  location_full?: string;
  description?: string;
  price?: number;
}

interface Contact {
  email: string;
  name: string;
  consent?: boolean;
  events?: string[];
}

interface EventOption {
  slug: string;
  title: string;
  count: number;
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/** Le rubriche da cui si può pescare. Le cantine non hanno email. */
const SOURCES = [
  { id: 'persone', label: 'Persone' },
  { id: 'membri', label: 'Membri' },
  { id: 'sponsors', label: 'Sponsor' },
  { id: 'bordeaux', label: 'Bordeaux' },
  { id: 'influencer', label: 'Influencer' },
] as const;

const s = (v: unknown) => (v == null ? '' : String(v));

async function loadSource(id: string, token: string): Promise<Contact[]> {
  const h = { Authorization: `Bearer ${token}` };
  const get = async (url: string) => {
    const r = await fetch(url, { headers: h });
    if (!r.ok) return null;
    return r.json().catch(() => null);
  };

  if (id === 'persone') {
    const j = await get('/api/crm/customers');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (j?.customers ?? []).map((c: any) => ({
      email: s(c.email),
      name: s(c.name),
      consent: c.consent_marketing === true,
      events: c.events ?? [],
    }));
  }
  if (id === 'membri') {
    const j = await get('/api/crm/members');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (j?.members ?? []).map((m: any) => ({ email: s(m.email), name: s(m.name) }));
  }
  if (id === 'sponsors') {
    const j = await get('/api/crm/sponsors');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (j?.sponsors ?? []).map((x: any) => ({ email: s(x.email), name: s(x.name) }));
  }
  if (id === 'bordeaux') {
    const j = await get('/api/crm/bordeaux');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (j?.contacts ?? []).map((x: any) => ({
      email: s(x.email),
      name: s(x.name) || s(x.company),
    }));
  }
  if (id === 'influencer') {
    const j = await get('/api/crm/influencers');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (j?.contacts ?? []).map((x: any) => ({
      email: s(x.email),
      name: [s(x.first_name), s(x.last_name)].filter(Boolean).join(' '),
    }));
  }
  // Una lista fatta a mano.
  const j = await get(`/api/crm/categories/${id}/contacts`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (j?.contacts ?? []).map((x: any) => ({
    email: s(x.email),
    name: [s(x.first_name), s(x.last_name)].filter(Boolean).join(' '),
  }));
}

function prefillForm(ev?: PrefillEvent) {
  if (!ev) {
    return {
      eventTitle: '',
      eventDate: '',
      eventLocation: '',
      eventDescription: '',
      ctaText: 'Scopri l’evento',
      ctaLink: 'https://vivowineclub.com/events',
    };
  }
  let eventDate = '';
  if (ev.date) {
    const [y, m, d] = ev.date.split('-');
    eventDate = `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
    if (ev.time) eventDate += ` · ${ev.time}`;
  }
  return {
    eventTitle: ev.title,
    eventDate,
    eventLocation: ev.location_full || ev.location || '',
    eventDescription: ev.description || '',
    ctaText: 'Scopri l’evento',
    ctaLink: `https://vivowineclub.com/checkout/${ev.slug}`,
  };
}

/* ─────────────────────────────────────────────
   Invito
───────────────────────────────────────────── */
export default function EventInvite({
  accessToken,
  customCategories,
  onClose,
  prefillEvent,
}: {
  accessToken: string | null;
  customCategories: CustomCategoryInfo[];
  onClose: () => void;
  prefillEvent?: PrefillEvent;
}) {
  const token = accessToken ?? '';

  const [step, setStep] = useState<'chi' | 'cosa'>('chi');
  const [sources, setSources] = useState<Set<string>>(new Set(['persone']));
  const [bySource, setBySource] = useState<Map<string, Contact[]>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const [events, setEvents] = useState<EventOption[]>([]);
  const [event, setEvent] = useState('');
  const [query, setQuery] = useState('');
  const [onlyConsent, setOnlyConsent] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(40);

  const [form, setForm] = useState(() => prefillForm(prefillEvent));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  // Il tasto indietro lo gestiscono i due genitori (CrmHub e
  // EventManager) con un booleano che passa da falso a vero. Chiamarlo
  // qui con `true` fisso lo romperebbe: in StrictMode l'effetto viene
  // eseguito, ripulito e rieseguito, e il `history.back()` della
  // pulizia chiuderebbe il foglio nell'istante in cui si apre.

  const allSources = useMemo(
    () => [...SOURCES.map((x) => ({ id: x.id as string, label: x.label })),
           ...customCategories.map((c) => ({ id: c.id, label: c.name }))],
    [customCategories],
  );

  /** Carica una rubrica la prima volta che la si accende. */
  const ensure = useCallback(
    async (id: string) => {
      if (bySource.has(id) || loading.has(id)) return;
      setLoading((p) => new Set(p).add(id));
      const rows = await loadSource(id, token).catch(() => []);
      setBySource((p) => new Map(p).set(id, rows));
      setLoading((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    },
    [bySource, loading, token],
  );

  useEffect(() => {
    ensure('persone');
    fetch('/api/events/guest-counts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (Array.isArray(j?.events)) {
          setEvents(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            j.events.map((e: any) => ({
              slug: e.slug,
              title: e.title || prettifySlug(e.slug),
              count: e.count ?? 0,
            })),
          );
        }
      })
      .catch(() => {});
    // Solo al montaggio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSource(id: string) {
    setSources((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else {
        n.add(id);
        ensure(id);
      }
      return n;
    });
  }

  /** Tutti i contatti delle rubriche accese, senza doppioni. */
  const pool = useMemo(() => {
    const seen = new Map<string, Contact>();
    for (const id of sources) {
      for (const c of bySource.get(id) ?? []) {
        const email = c.email.trim().toLowerCase();
        if (!email || !email.includes('@')) continue;
        const prev = seen.get(email);
        // Una persona può stare in due rubriche: si tiene il dato più
        // ricco, perché il consenso arriva solo da "Persone".
        if (!prev) seen.set(email, { ...c, email });
        else
          seen.set(email, {
            ...prev,
            name: prev.name || c.name,
            consent: prev.consent || c.consent,
            events: prev.events?.length ? prev.events : c.events,
          });
      }
    }
    return [...seen.values()];
  }, [sources, bySource]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool.filter((c) => {
      if (excluded.has(c.email)) return false;
      if (event && !(c.events ?? []).includes(event)) return false;
      if (onlyConsent && !c.consent) return false;
      if (q && !`${c.name} ${c.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pool, query, event, onlyConsent, excluded]);

  const recipients = useMemo(() => mailable(filtered as never), [filtered]);
  const consenting = useMemo(() => filtered.filter((c) => c.consent).length, [filtered]);

  useEffect(() => {
    setShown(40);
  }, [query, event, onlyConsent, sources]);

  const busy = loading.size > 0;

  async function send() {
    if (!form.eventTitle.trim()) {
      setError('Serve almeno il titolo dell’evento.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/crm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: 'event',
          recipients,
          subject: form.eventTitle.trim(),
          eventParams: form,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Invio non riuscito.');
      setResult({ sent: data.sent ?? recipients.length, failed: data.failed ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSending(false);
    }
  }

  /* ── Mandato ── */
  if (result) {
    return (
      <Sheet
        open
        title="Invito mandato"
        onClose={onClose}
        footer={
          <ActionButton onClick={onClose} className="w-full">
            Chiudi
          </ActionButton>
        }
      >
        <p className="ds-display text-[32px] leading-none tracking-[-0.02em]">{result.sent}</p>
        <p className="mt-2 text-body text-on-paper-muted">
          {result.sent === 1 ? 'persona ha ricevuto l’invito' : 'persone hanno ricevuto l’invito'}
          {result.failed > 0 && ` · ${result.failed} non sono andate a buon fine`}.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      title={step === 'chi' ? 'A chi' : 'Cosa scrivere'}
      onClose={onClose}
      footer={
        step === 'chi' ? (
          <div className="flex gap-2.5">
            <ActionButton variant="quiet" onClick={onClose} className="flex-1">
              Annulla
            </ActionButton>
            <ActionButton
              onClick={() => setStep('cosa')}
              disabled={recipients.length === 0 || busy}
              className="flex-[2]"
            >
              Avanti · {recipients.length}
            </ActionButton>
          </div>
        ) : (
          <div className="flex gap-2.5">
            <ActionButton variant="quiet" onClick={() => setStep('chi')} className="flex-1">
              <ChevronLeft size={16} strokeWidth={1.9} />
              Indietro
            </ActionButton>
            <ActionButton onClick={send} disabled={sending} className="flex-[2]">
              {sending ? 'Invio…' : `Invia a ${recipients.length}`}
            </ActionButton>
          </div>
        )
      }
    >
      {step === 'chi' ? (
        <div className="flex flex-col gap-5">
          {/* Quante persone, adesso. Sempre in cima. */}
          <div className="rounded-2xl border border-rule-paper p-4">
            <p className="ds-display text-[30px] leading-none tracking-[-0.02em]">
              {busy ? '…' : recipients.length}
            </p>
            <p className="mt-1 text-fine text-on-paper-muted">
              {recipients.length === 1 ? 'destinatario' : 'destinatari'}
              {!onlyConsent && ` · ${consenting} con consenso marketing`}
            </p>
            {event && (
              <p className="mt-2 text-fine text-on-paper-muted">
                Il filtro per evento tiene solo chi risulta aver partecipato, quindi i contatti
                delle altre rubriche restano fuori.
              </p>
            )}
          </div>

          <Field label="Da quali rubriche">
            <div className="flex flex-wrap gap-2">
              {allSources.map((o) => {
                const on = sources.has(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleSource(o.id)}
                    aria-pressed={on}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors ${
                      on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                    }`}
                  >
                    {on && <Check size={14} strokeWidth={2.5} />}
                    {o.label}
                    {loading.has(o.id) && ' …'}
                  </button>
                );
              })}
            </div>
          </Field>

          {sources.has('persone') && events.length > 0 && (
            <Field
              label="Solo chi è venuto a"
              hint="— tiene solo chi risulta esserci stato"
            >
              <div className="relative">
                <select
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 pr-11 text-body [font-size:16px] focus:border-accent/50 focus:outline-none"
                >
                  <option value="">Qualunque evento</option>
                  {events.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.title} — {e.count}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-paper-muted">
                  <svg width="11" height="7" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Field>
          )}

          <button
            type="button"
            onClick={() => setOnlyConsent((v) => !v)}
            aria-pressed={onlyConsent}
            className={`inline-flex min-h-[48px] items-center gap-2 self-start rounded-full border px-4 text-fine font-medium transition-colors ${
              onlyConsent ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
            }`}
          >
            <ShieldCheck size={16} strokeWidth={1.8} />
            Solo con consenso marketing
          </button>

          <div className="flex items-center gap-2.5 rounded-full border border-rule-paper px-4">
            <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per togliere qualcuno"
              className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Pulisci"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft"
              >
                <X size={15} strokeWidth={2} />
              </button>
            )}
          </div>

          {filtered.length > 0 && (
            <div>
              <div className="flex flex-col gap-1">
                {filtered.slice(0, shown).map((c) => (
                  <div
                    key={c.email}
                    className="flex items-center gap-2 rounded-xl border border-rule-paper px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body">{c.name || c.email}</span>
                      <span className="block truncate text-fine text-on-paper-muted">{c.email}</span>
                    </span>
                    <button
                      onClick={() => setExcluded((p) => new Set(p).add(c.email))}
                      aria-label={`Togli ${c.email}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-paper-muted hover:bg-paper-soft hover:text-accent"
                    >
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
              {filtered.length > shown && (
                <button
                  onClick={() => setShown((n) => n + 80)}
                  className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-dashed border-rule-paper text-fine font-medium hover:border-accent/50"
                >
                  Mostra altri · ne restano {filtered.length - shown}
                </button>
              )}
            </div>
          )}

          {excluded.size > 0 && (
            <button
              onClick={() => setExcluded(new Set())}
              className="self-start text-fine font-medium text-accent"
            >
              Rimetti {excluded.size} {excluded.size === 1 ? 'persona tolta' : 'persone tolte'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="rounded-2xl border border-rule-paper px-4 py-3 text-fine">
            <span className="font-medium">{recipients.length}</span> destinatari.{' '}
            <button onClick={() => setStep('chi')} className="font-medium text-accent">
              Cambia
            </button>
          </p>

          <Field label="Titolo dell'evento" hint="— è anche l'oggetto della mail">
            <TextInput
              autoFocus
              value={form.eventTitle}
              onChange={(e) => setForm({ ...form, eventTitle: e.target.value })}
              placeholder="VIVO Wine Party"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Quando">
              <TextInput
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                placeholder="14 Novembre 2026 · 20:00"
              />
            </Field>
            <Field label="Dove">
              <TextInput
                value={form.eventLocation}
                onChange={(e) => setForm({ ...form, eventLocation: e.target.value })}
                placeholder="Magazzini Generali, Milano"
              />
            </Field>
          </div>

          <Field label="Descrizione">
            <TextArea
              rows={5}
              value={form.eventDescription}
              onChange={(e) => setForm({ ...form, eventDescription: e.target.value })}
              placeholder="Due righe su cosa succede quella sera…"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Testo del pulsante">
              <TextInput
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
              />
            </Field>
            <Field label="Dove porta">
              <TextInput
                type="url"
                value={form.ctaLink}
                onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
              />
            </Field>
          </div>

          {error && <p className="text-fine font-medium text-accent">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}
