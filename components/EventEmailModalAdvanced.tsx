'use client';

/**
 * EventEmailModalAdvanced
 * Full-featured event announcement modal with:
 *  - Multi-CRM source selection
 *  - Text search filter
 *  - Multi-event filter with AND/OR logic
 *  - Tier filter (Membri only)
 *  - Scrollable contact list with individual checkboxes
 *  - Deduplication by email
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Send, Check, AlertCircle, ChevronDown, ChevronUp,
  Loader2, Search, Users,
} from 'lucide-react';

/* ── Types ── */
export interface CustomCategoryInfo { id: string; name: string }

interface RawContact { name: string; email: string; tier?: string }

interface DisplayContact {
  email:   string;
  name:    string;
  sources: string[];
  tier?:   string;
}

interface EventWithCount { slug: string; title: string; count: number }

/* ── Source definitions ── */
// Vino (contacts_wine) has no email field — excluded from email sources
const BUILTIN_SOURCES = [
  { id: 'membri',     label: 'Membri'         },
  { id: 'clienti',   label: 'Clienti'        },
  { id: 'sponsors',  label: 'Sponsors'       },
  { id: 'bordeaux',  label: 'Produttori BDX' },
  { id: 'influencer', label: 'Influencer'    },
] as const;

type BuiltinSourceId = typeof BUILTIN_SOURCES[number]['id'];

/* ── Fetch helpers ── */
async function fetchSource(
  sourceId: string,
  accessToken: string,
  label: string,
): Promise<RawContact[]> {
  const h = { Authorization: `Bearer ${accessToken}` };
  try {
    if (sourceId === 'membri') {
      const j = await fetch('/api/crm/members',   { headers: h }).then(r => r.json());
      return (j.members ?? []).map((m: { name: string; email: string; tier?: string }) =>
        ({ name: m.name, email: m.email, tier: m.tier }));
    }
    if (sourceId === 'clienti') {
      const j = await fetch('/api/crm/customers', { headers: h }).then(r => r.json());
      return (j.customers ?? []).map((c: { name: string; email: string }) =>
        ({ name: c.name, email: c.email }));
    }
    if (sourceId === 'sponsors') {
      const j = await fetch('/api/crm/sponsors',  { headers: h }).then(r => r.json());
      return (j.sponsors ?? [])
        .filter((s: { email: string | null }) => s.email)
        .map((s: { name: string; email: string }) => ({ name: s.name, email: s.email }));
    }
    if (sourceId === 'bordeaux') {
      const j = await fetch('/api/crm/bordeaux',  { headers: h }).then(r => r.json());
      return (j.contacts ?? [])
        .filter((c: { email: string | null }) => c.email)
        .map((c: { name: string; company: string; email: string }) =>
          ({ name: c.name || c.company, email: c.email }));
    }
    if (sourceId === 'influencer') {
      const j = await fetch('/api/crm/influencers', { headers: h }).then(r => r.json());
      return (j.contacts ?? [])
        .filter((c: { email: string | null }) => c.email)
        .map((c: { first_name: string; last_name: string; email: string }) =>
          ({ name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email, email: c.email }));
    }
    // Custom category
    const j = await fetch(`/api/crm/categories/${sourceId}/contacts`, { headers: h }).then(r => r.json());
    return (j.contacts ?? [])
      .filter((c: { email: string }) => c.email)
      .map((c: { first_name: string; last_name: string; email: string }) =>
        ({ name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email, email: c.email }));
  } catch {
    return [];
  }
  void label; // suppress unused warning
}

/** Merge raw contacts from multiple sources, deduplicate by email */
function mergeContacts(
  raw: Map<string, RawContact[]>,
  sourceLabels: Map<string, string>,
): DisplayContact[] {
  const byEmail = new Map<string, DisplayContact>();
  for (const [sourceId, contacts] of raw) {
    const label = sourceLabels.get(sourceId) ?? sourceId;
    for (const c of contacts) {
      const email = c.email.trim().toLowerCase();
      if (!email) continue;
      const existing = byEmail.get(email);
      if (existing) {
        if (!existing.sources.includes(label)) existing.sources.push(label);
      } else {
        byEmail.set(email, { email, name: c.name || email, sources: [label], tier: c.tier });
      }
    }
  }
  return Array.from(byEmail.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/* ── Prefill event type ── */
export interface PrefillEvent {
  slug:          string;
  title:         string;
  date?:         string;
  time?:         string | null;
  location?:     string;
  location_full?: string;
  description?:  string;
  price?:        number;
}

/* ── Email form ── */
const inputCls = 'w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-3 py-2.5 text-sm placeholder-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors';

interface EmailForm {
  eventTitle: string; eventDate: string; eventLocation: string;
  eventDescription: string; ctaText: string; ctaLink: string;
}

const FORM_DEFAULT: EmailForm = {
  eventTitle: '', eventDate: '', eventLocation: '', eventDescription: '',
  ctaText: "SCOPRI L'EVENTO", ctaLink: 'https://vivowineclub.com/events',
};

function buildPrefillForm(ev: PrefillEvent): EmailForm {
  let eventDate = '';
  if (ev.date) {
    const [y, m, d] = ev.date.split('-');
    const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    eventDate = `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    if (ev.time) eventDate += ` · ${ev.time}`;
  }
  return {
    eventTitle:       ev.title,
    eventDate,
    eventLocation:    ev.location_full || ev.location || '',
    eventDescription: ev.description || '',
    ctaText:          "SCOPRI L'EVENTO",
    ctaLink:          `https://vivowineclub.com/checkout/${ev.slug}`,
  };
}

/* ── Main component ── */
export default function EventEmailModalAdvanced({
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
  /* ── Source selection ── */
  const allSources = useMemo(() => [
    ...BUILTIN_SOURCES.map(s => ({ id: s.id as string, label: s.label })),
    ...customCategories.map(c => ({ id: c.id, label: c.name })),
  ], [customCategories]);

  const sourceLabels = useMemo(
    () => new Map(allSources.map(s => [s.id, s.label])),
    [allSources],
  );

  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    () => new Set(allSources.map(s => s.id)),
  );

  /* ── Contacts ── */
  const [rawBySource, setRawBySource] = useState<Map<string, RawContact[]>>(new Map());
  const [loadingSources, setLoadingSources] = useState<Set<string>>(new Set());

  /* ── Event filter ── */
  const [pastEvents, setPastEvents] = useState<EventWithCount[]>([]);
  const [selectedEventSlugs, setSelectedEventSlugs] = useState<string[]>([]);
  const [eventLogic, setEventLogic] = useState<'OR' | 'AND'>('OR');
  const [participantCache, setParticipantCache] = useState<Map<string, Set<string>>>(new Map());
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventFilter, setShowEventFilter] = useState(false);

  /* ── Text / tier filter ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter]   = useState('');

  /* ── Contact selection ── */
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  /* ── Email form / sending ── */
  const [form, setForm]     = useState<EmailForm>(() => prefillEvent ? buildPrefillForm(prefillEvent) : FORM_DEFAULT);
  const [showForm, setShowForm] = useState(!!prefillEvent);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ sent: number; failed: number; failedEmails?: { email: string; error: string }[] } | null>(null);

  const set = (k: keyof EmailForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  /* ── Lock body scroll ── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ── Load past events ── */
  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/events/guest-counts', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(j => setPastEvents(j.events ?? []))
      .catch(() => {});
  }, [accessToken]);

  /* ── Fetch source when selected ── */
  const fetchSourceIfNeeded = useCallback(async (sourceId: string) => {
    if (!accessToken) return;
    if (rawBySource.has(sourceId)) return;  // already fetched
    setLoadingSources(prev => new Set(prev).add(sourceId));
    const label = sourceLabels.get(sourceId) ?? sourceId;
    const contacts = await fetchSource(sourceId, accessToken, label);
    setRawBySource(prev => new Map(prev).set(sourceId, contacts));
    setLoadingSources(prev => { const n = new Set(prev); n.delete(sourceId); return n; });
  }, [accessToken, rawBySource, sourceLabels]);

  /* ── Initial fetch for all default-selected sources ── */
  useEffect(() => {
    if (!accessToken) return;
    for (const s of allSources) fetchSourceIfNeeded(s.id);
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Merged contacts from currently selected sources ── */
  const allContacts = useMemo(() => {
    const activeRaw = new Map<string, RawContact[]>();
    for (const sourceId of selectedSources) {
      const data = rawBySource.get(sourceId);
      if (data) activeRaw.set(sourceId, data);
    }
    return mergeContacts(activeRaw, sourceLabels);
  }, [rawBySource, selectedSources, sourceLabels]);

  /* ── Apply event filter ── */
  const eventFilteredContacts = useMemo(() => {
    if (selectedEventSlugs.length === 0) return allContacts;
    const cachedSets = selectedEventSlugs
      .map(slug => participantCache.get(slug))
      .filter((s): s is Set<string> => s !== undefined);

    if (cachedSets.length !== selectedEventSlugs.length) return allContacts; // still loading

    return allContacts.filter(c => {
      const email = c.email.toLowerCase();
      if (eventLogic === 'OR') {
        return cachedSets.some(set => set.has(email));
      } else {
        return cachedSets.every(set => set.has(email));
      }
    });
  }, [allContacts, selectedEventSlugs, participantCache, eventLogic]);

  /* ── Apply text + tier filter ── */
  const displayContacts = useMemo(() => {
    let list = eventFilteredContacts;
    if (tierFilter) {
      list = list.filter(c => c.tier === tierFilter);
    }
    const q = searchQuery.toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [eventFilteredContacts, searchQuery, tierFilter]);

  /* ── Sync selectedEmails when contacts change (select all by default) ── */
  useEffect(() => {
    setSelectedEmails(new Set(allContacts.map(c => c.email)));
  }, [allContacts]);

  /* ── Load event participants ── */
  async function loadEventParticipants(slug: string) {
    if (participantCache.has(slug) || !accessToken) return;
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/events/${slug}/participants`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const j = await res.json();
      const set = new Set<string>((j.emails ?? []).map((e: string) => e.toLowerCase()));
      setParticipantCache(prev => new Map(prev).set(slug, set));
    } finally {
      setLoadingEvents(false);
    }
  }

  function toggleEventSlug(slug: string) {
    setSelectedEventSlugs(prev => {
      if (prev.includes(slug)) return prev.filter(s => s !== slug);
      const next = [...prev, slug];
      loadEventParticipants(slug);
      return next;
    });
  }

  /* ── Source toggle ── */
  function toggleSource(id: string) {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); fetchSourceIfNeeded(id); }
      return next;
    });
  }

  const allSourcesSelected = selectedSources.size === allSources.length;
  function toggleAllSources() {
    if (allSourcesSelected) {
      setSelectedSources(new Set());
    } else {
      for (const s of allSources) fetchSourceIfNeeded(s.id);
      setSelectedSources(new Set(allSources.map(s => s.id)));
    }
  }

  /* ── Contact selection ── */
  function toggleEmail(email: string) {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  }

  const displaySelected = displayContacts.filter(c => selectedEmails.has(c.email));
  const allDisplaySelected = displayContacts.length > 0 && displaySelected.length === displayContacts.length;

  function toggleAllDisplay() {
    if (allDisplaySelected) {
      setSelectedEmails(prev => {
        const next = new Set(prev);
        displayContacts.forEach(c => next.delete(c.email));
        return next;
      });
    } else {
      setSelectedEmails(prev => {
        const next = new Set(prev);
        displayContacts.forEach(c => next.add(c.email));
        return next;
      });
    }
  }

  // Total selected that actually have emails (intersection with all contacts)
  const totalSelected = allContacts.filter(c => selectedEmails.has(c.email)).length;

  /* ── Send ── */
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const recipients = allContacts
        .filter(c => selectedEmails.has(c.email))
        .map(c => ({ email: c.email, name: c.name }));
      const res = await fetch('/api/crm/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:        'event',
          recipients,
          subject:     `Nuovo evento: ${form.eventTitle} — Vivo Wine Club`,
          eventParams: form,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setResult({ sent: j.sent, failed: j.failed, failedEmails: j.failedEmails });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  const hasMembriSelected = selectedSources.has('membri');

  /* ── Source badge colors ── */
  const SOURCE_COLORS: Record<string, string> = {
    Membri:          'bg-[#731515]/10 text-[#731515]',
    Clienti:         'bg-blue-50 text-blue-700',
    Sponsors:        'bg-amber-50 text-amber-700',
    'Produttori BDX': 'bg-purple-50 text-purple-700',
    Influencer:      'bg-pink-50 text-pink-700',
  };
  function sourceBadgeColor(label: string) {
    return SOURCE_COLORS[label] ?? 'bg-gray-100 text-gray-600';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-full max-w-2xl max-h-[92vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-[#e8d5d5] shrink-0 flex items-center justify-between">
          <div className="min-w-0 mr-3">
            <div className="text-[9px] tracking-[0.4em] text-[#731515]">
              {prefillEvent ? 'INVITA CLIENTI CRM' : 'ANNUNCIO NUOVO EVENTO'}
            </div>
            {prefillEvent ? (
              <div className="text-[13px] font-medium text-[#1a0505] mt-0.5 truncate" style={{ fontFamily: 'var(--font-syne)' }}>
                {prefillEvent.title}
              </div>
            ) : (
              <div className="text-[11px] text-[#7a4a4a]/60 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                {totalSelected} contatti selezionati
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#7a4a4a]/40 hover:text-[#731515] transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        {status === 'done' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center overflow-y-auto">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center shrink-0">
              <Check size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1a0505]">{result?.sent} email inviate</p>
              {(result?.failed ?? 0) > 0 && (
                <p className="text-xs text-[#731515] mt-1">{result?.failed} fallite</p>
              )}
              {result?.failedEmails && result.failedEmails.length > 0 && (
                <div className="mt-3 text-left bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
                  {result.failedEmails.map(f => (
                    <div key={f.email} className="text-[10px] text-red-600 truncate">{f.email}</div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="px-6 py-2 bg-[#731515] text-white text-xs tracking-[0.2em] hover:bg-[#aa4848] transition-colors rounded-lg">
              CHIUDI
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-5">

              {/* ── CRM Source selection ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-[#731515]" />
                    <span className="text-[9px] tracking-[0.35em] text-[#731515]">SCEGLI CRM</span>
                  </div>
                  <button
                    onClick={toggleAllSources}
                    className="text-[9px] tracking-[0.2em] text-[#731515] hover:underline"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {allSourcesSelected ? 'DESELEZIONA TUTTI' : 'SELEZIONA TUTTI'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSources.map(s => (
                    <label key={s.id} className="flex items-center gap-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedSources.has(s.id)}
                        onChange={() => toggleSource(s.id)}
                        className="w-3 h-3 accent-[#731515] cursor-pointer"
                      />
                      <span className={`text-[10px] tracking-[0.1em] transition-colors ${
                        selectedSources.has(s.id) ? 'text-[#1a0505]' : 'text-[#7a4a4a]/40'
                      }`} style={{ fontFamily: 'var(--font-nunito)' }}>
                        {s.label}
                        {loadingSources.has(s.id) && <Loader2 size={8} className="inline ml-1 animate-spin" />}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Filters ── */}
              <div className="border border-[#e8d5d5] rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowEventFilter(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#fdf6f6] text-[9px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors"
                >
                  <span>FILTRI AVANZATI {selectedEventSlugs.length > 0 && `(${selectedEventSlugs.length} evento${selectedEventSlugs.length > 1 ? 'i' : ''})`}</span>
                  {showEventFilter ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showEventFilter && (
                  <div className="px-4 py-3 space-y-3 border-t border-[#e8d5d5]">
                    {/* Event filter */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] tracking-[0.25em] text-[#7a4a4a]/70">PARTECIPANTI A EVENTO</span>
                        {selectedEventSlugs.length > 1 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-[#7a4a4a]/50">Logica:</span>
                            <button
                              onClick={() => setEventLogic(v => v === 'OR' ? 'AND' : 'OR')}
                              className="text-[9px] tracking-[0.15em] px-2 py-0.5 border border-[#731515]/30 text-[#731515] rounded hover:bg-[#fdf0f0] transition-colors"
                            >
                              {eventLogic}
                            </button>
                          </div>
                        )}
                      </div>
                      {pastEvents.length === 0 ? (
                        <p className="text-[10px] text-[#7a4a4a]/40 italic">Nessun evento con lista invitati trovato</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                          {pastEvents.map(ev => (
                            <label key={ev.slug} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedEventSlugs.includes(ev.slug)}
                                onChange={() => toggleEventSlug(ev.slug)}
                                className="w-3 h-3 accent-[#731515] cursor-pointer shrink-0"
                              />
                              <span className="text-[10px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                                {ev.title}
                                <span className="text-[#7a4a4a]/40 ml-1">({ev.count})</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      {loadingEvents && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#7a4a4a]/50">
                          <Loader2 size={10} className="animate-spin" /> Caricamento partecipanti…
                        </div>
                      )}
                    </div>

                    {/* Tier filter (only if Membri selected) */}
                    {hasMembriSelected && (
                      <div>
                        <div className="text-[9px] tracking-[0.25em] text-[#7a4a4a]/70 mb-2">RUOLO (MEMBRI)</div>
                        <div className="flex gap-2 flex-wrap">
                          {['', 'Member', 'Staff'].map(t => (
                            <button
                              key={t || 'all'}
                              onClick={() => setTierFilter(t)}
                              className={`px-3 py-1 text-[9px] tracking-[0.15em] rounded-full border transition-colors ${
                                tierFilter === t
                                  ? 'bg-[#731515] text-white border-[#731515]'
                                  : 'border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40'
                              }`}
                            >
                              {t || 'TUTTI'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Search ── */}
              <div className="flex items-center gap-2 bg-[#fdf6f6] border border-[#e8d5d5] rounded-lg px-3 py-1.5">
                <Search size={11} className="text-[#7a4a4a]/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Cerca per nome, cognome o email…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] text-[#1a0505] placeholder:text-[#7a4a4a]/30 focus:outline-none"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* ── Contact list ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/60">
                    {displaySelected.length} SELEZIONATI SU {displayContacts.length}
                    {displayContacts.length !== allContacts.length && ` (${allContacts.length} totali)`}
                  </span>
                </div>
                <div className="border border-[#e8d5d5] rounded-lg overflow-hidden">
                  {/* Select-all row */}
                  <label className="flex items-center gap-2.5 px-3 py-2 bg-[#fdf6f6] border-b border-[#e8d5d5] cursor-pointer hover:bg-[#fdf0f0] transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={allDisplaySelected}
                      onChange={toggleAllDisplay}
                      className="w-3.5 h-3.5 cursor-pointer accent-[#731515] shrink-0"
                    />
                    <span className="text-[10px] font-semibold text-[#731515] tracking-[0.2em]">
                      {allDisplaySelected ? 'DESELEZIONA TUTTI' : 'SELEZIONA TUTTI'}
                    </span>
                  </label>
                  {/* Contact rows */}
                  <div className="max-h-52 overflow-y-auto divide-y divide-[#f0e4e4]">
                    {displayContacts.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[11px] text-[#7a4a4a]/40">
                        {loadingSources.size > 0 ? 'Caricamento contatti…' : 'Nessun contatto trovato'}
                      </div>
                    ) : displayContacts.map(c => (
                      <label
                        key={c.email}
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#fdf6f6] transition-colors select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(c.email)}
                          onChange={() => toggleEmail(c.email)}
                          className="w-3.5 h-3.5 cursor-pointer accent-[#731515] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] text-[#1a0505] font-medium truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                              {c.name}
                            </span>
                            {c.sources.map(src => (
                              <span key={src} className={`text-[8px] tracking-[0.1em] px-1.5 py-0.5 rounded ${sourceBadgeColor(src)}`}>
                                {src}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-[#7a4a4a]/55 truncate">{c.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Email form (collapsible) ── */}
              <div className="border border-[#e8d5d5] rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowForm(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#fdf6f6] text-[9px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors"
                >
                  <span>CONTENUTO EMAIL</span>
                  {showForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showForm && (
                  <div className="px-4 py-4 space-y-3 border-t border-[#e8d5d5]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] tracking-[0.25em] text-[#7a4a4a]/60 mb-1.5">TITOLO EVENTO *</label>
                        <input value={form.eventTitle} onChange={set('eventTitle')} required placeholder="Wine Party Estate 2026" className={inputCls + ' rounded-lg text-sm'} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[0.25em] text-[#7a4a4a]/60 mb-1.5">DATA</label>
                        <input value={form.eventDate} onChange={set('eventDate')} placeholder="Sabato 15 Agosto 2026" className={inputCls + ' rounded-lg text-sm'} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.25em] text-[#7a4a4a]/60 mb-1.5">LOCATION</label>
                      <input value={form.eventLocation} onChange={set('eventLocation')} placeholder="Rooftop Milano, Via Brera 12" className={inputCls + ' rounded-lg text-sm'} />
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.25em] text-[#7a4a4a]/60 mb-1.5">DESCRIZIONE</label>
                      <textarea value={form.eventDescription} onChange={set('eventDescription')} rows={3} placeholder="Breve descrizione…" className={inputCls + ' rounded-lg text-sm resize-none'} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] tracking-[0.25em] text-[#7a4a4a]/60 mb-1.5">TESTO CTA</label>
                        <input value={form.ctaText} onChange={set('ctaText')} className={inputCls + ' rounded-lg text-sm'} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[0.25em] text-[#7a4a4a]/60 mb-1.5">LINK CTA</label>
                        <input value={form.ctaLink} onChange={set('ctaLink')} type="url" className={inputCls + ' rounded-lg text-sm'} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Footer / Send button ── */}
        {status !== 'done' && (
          <div className="px-6 py-4 border-t border-[#e8d5d5] shrink-0 space-y-3">
            {status === 'error' && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={13} className="text-red-500 shrink-0" />
                <span className="text-[11px] text-red-600">Errore durante l&apos;invio. Riprova.</span>
              </div>
            )}
            {!showForm && (
              <p className="text-[10px] text-[#7a4a4a]/50 text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
                Apri &quot;Contenuto Email&quot; per compilare i dettagli dell&apos;evento prima di inviare.
              </p>
            )}
            <form onSubmit={handleSend}>
              <button
                type="submit"
                disabled={totalSelected === 0 || !form.eventTitle || status === 'sending'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#aa4848] disabled:opacity-40 transition-colors rounded-lg"
              >
                <Send size={13} />
                {status === 'sending'
                  ? 'INVIO IN CORSO…'
                  : `INVIA A ${totalSelected} CONTATT${totalSelected === 1 ? 'O' : 'I'}`}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
