'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, CheckCheck, Check, Loader2, LogOut, Wine, ChevronDown, Link2, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Guest {
  id:          string;
  event_slug:  string;
  first_name:  string;
  last_name:   string;
  email:       string;
  phone:       string | null;
  checked_in:  boolean;
  created_at:  string;
}

interface EventData {
  id:       string;
  slug:     string;
  title:    string;
  date:     string;
  location: string;
  guests:   Guest[];
}

interface Partner {
  id:               string;
  name:             string;
  code:             string;
  total_registered: number;
  total_checkedin:  number;
}

interface Props {
  token:    string;
  onLogout: () => void;
  name:     string;
}

export default function CollaboratorView({ token, onLogout, name }: Props) {
  const [events,          setEvents]          = useState<EventData[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [activeSlug,      setActiveSlug]      = useState<string | null>(null);
  const [toggling,        setToggling]        = useState<Set<string>>(new Set());
  const [search,          setSearch]          = useState('');
  const [activeTab,       setActiveTab]       = useState<'guests' | 'partners'>('guests');
  const [partners,        setPartners]        = useState<Partner[]>([]);
  const [eventTotal,      setEventTotal]      = useState(0);
  const [partnerLoading,  setPartnerLoading]  = useState(false);

  /* ── Load assigned events ── */
  function loadEvents() {
    setLoading(true);
    fetch('/api/collaborator/events', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(j => {
        const evs: EventData[] = Array.isArray(j.events) ? j.events : [];
        setEvents(evs);
        if (evs.length > 0 && !activeSlug) setActiveSlug(evs[0].slug);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load partner stats for the active event ── */
  const loadPartners = useCallback(async (slug: string) => {
    setPartnerLoading(true);
    try {
      const res = await fetch(`/api/events/${slug}/partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setPartners([]); setEventTotal(0); return; }
      const data = await res.json();
      setPartners(data.partners ?? []);
      setEventTotal(data.event_total_registered ?? 0);
    } catch {
      setPartners([]); setEventTotal(0);
    } finally {
      setPartnerLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeSlug) loadPartners(activeSlug);
  }, [activeSlug, loadPartners]);

  /* ── Realtime subscriptions for each event ── */
  useEffect(() => {
    if (!token || events.length === 0) return;

    supabase.realtime.setAuth(token);

    const channels = events.map(ev =>
      supabase
        .channel(`collab_guests_${ev.slug}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, {
          event: '*', schema: 'public', table: 'event_guests',
          filter: `event_slug=eq.${ev.slug}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, (payload: any) => {
          setEvents(prev => prev.map(e => {
            if (e.slug !== ev.slug) return e;
            if (payload.eventType === 'INSERT') {
              const exists = e.guests.some(g => g.id === payload.new.id);
              return exists ? e : { ...e, guests: [...e.guests, payload.new].sort(sortGuests) };
            }
            if (payload.eventType === 'UPDATE') {
              setToggling(p => { const n = new Set(p); n.delete(payload.new.id); return n; });
              return { ...e, guests: e.guests.map(g => g.id === payload.new.id ? { ...g, ...payload.new } : g) };
            }
            if (payload.eventType === 'DELETE') {
              return { ...e, guests: e.guests.filter(g => g.id !== payload.old.id) };
            }
            return e;
          }));
        })
        .subscribe()
    );

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [token, events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Realtime: refresh partner stats when guests change on the active event ── */
  useEffect(() => {
    if (!activeSlug) return;
    const channel = supabase
      .channel(`collab_partners_${activeSlug}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table: 'event_guests',
        filter: `event_slug=eq.${activeSlug}`,
      }, () => { loadPartners(activeSlug); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSlug, loadPartners]);

  function sortGuests(a: Guest, b: Guest) {
    const la = a.last_name.toLowerCase(), lb = b.last_name.toLowerCase();
    if (la !== lb) return la < lb ? -1 : 1;
    return a.first_name.toLowerCase() < b.first_name.toLowerCase() ? -1 : 1;
  }

  async function toggleCheckIn(guest: Guest, eventSlug: string) {
    if (toggling.has(guest.id)) return;

    const next = !guest.checked_in;
    setToggling(p => new Set(p).add(guest.id));
    setEvents(prev => prev.map(e =>
      e.slug !== eventSlug ? e : {
        ...e,
        guests: e.guests.map(g => g.id === guest.id ? { ...g, checked_in: next } : g),
      }
    ));

    try {
      const res = await fetch('/api/collaborator/checkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ guestId: guest.id, eventSlug, checkedIn: next }),
      });
      if (!res.ok) throw new Error('API error');
    } catch {
      // Revert
      setEvents(prev => prev.map(e =>
        e.slug !== eventSlug ? e : {
          ...e,
          guests: e.guests.map(g => g.id === guest.id ? { ...g, checked_in: guest.checked_in } : g),
        }
      ));
    } finally {
      setTimeout(() => setToggling(p => { const n = new Set(p); n.delete(guest.id); return n; }), 2000);
    }
  }

  const activeEvent = events.find(e => e.slug === activeSlug) ?? null;

  const filtered = (activeEvent?.guests ?? []).filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.first_name.toLowerCase().includes(q) ||
      g.last_name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q)
    );
  });

  const checkedIn = activeEvent?.guests.filter(g => g.checked_in).length ?? 0;
  const total     = activeEvent?.guests.length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf9f9] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf9f9] text-[#1a0505] flex flex-col" style={{ fontFamily: 'var(--font-nunito)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0e4e4] bg-white shrink-0 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/main-logo.png" alt="Vivo" className="h-6 object-contain" />
          <span className="text-[9px] tracking-[0.45em] text-[#7a4a4a]/40 uppercase hidden sm:block">Collaboratore</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#7a4a4a]/60 hidden sm:block">{name}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[11px] text-[#7a4a4a]/50 hover:text-[#731515] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#fdf6f6] border border-transparent hover:border-[#eddada]"
          >
            <LogOut size={12} />
            Esci
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-[#fdf6f6] flex items-center justify-center">
            <Wine size={22} className="text-[#eddada]" />
          </div>
          <p className="text-[9px] tracking-[0.5em] text-[#7a4a4a]/40 uppercase">Nessun evento assegnato</p>
          <p className="text-sm text-[#7a4a4a]/60 max-w-xs leading-relaxed">
            Non ti è stato ancora assegnato nessun evento. Contatta l&apos;amministratore.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Event selector (if multiple) */}
          {events.length > 1 && (
            <div className="px-5 py-3 border-b border-[#f0e4e4] bg-white shrink-0">
              <div className="relative inline-block w-full max-w-sm">
                <select
                  value={activeSlug ?? ''}
                  onChange={e => { setActiveSlug(e.target.value); setSearch(''); setActiveTab('guests'); }}
                  className="w-full appearance-none bg-[#fdf6f6] border border-[#eddada] rounded-xl px-4 py-2.5 text-[13px] text-[#1a0505] pr-9 cursor-pointer focus:outline-none focus:border-[#731515]/50 transition-colors"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {events.map(ev => (
                    <option key={ev.slug} value={ev.slug}>{ev.title}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a4a4a]/40 pointer-events-none" />
              </div>
            </div>
          )}

          {activeEvent && (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Event info + counters */}
              <div className="px-5 py-4 border-b border-[#f0e4e4] bg-white shrink-0">
                {events.length === 1 && (
                  <div className="mb-4">
                    <div className="text-[9px] tracking-[0.5em] text-[#731515] mb-1">EVENTO</div>
                    <div
                      className="text-[19px] font-light leading-tight text-[#1a0505]"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {activeEvent.title}
                    </div>
                    <div className="text-[11px] text-[#7a4a4a]/50 mt-1">
                      {activeEvent.date && new Date(activeEvent.date).toLocaleDateString('it-IT', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {activeEvent.location && ` · ${activeEvent.location}`}
                    </div>
                  </div>
                )}

                {/* Counters */}
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#731515]/8 flex items-center justify-center">
                      <Users size={15} className="text-[#731515]" />
                    </div>
                    <div>
                      <div className="text-xl font-semibold text-[#1a0505] leading-none tabular-nums" style={{ fontFamily: 'var(--font-syne)' }}>{total}</div>
                      <div className="text-[9px] tracking-[0.25em] text-[#7a4a4a]/50 mt-0.5">ISCRITTI</div>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-[#eddada]" />
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                      <CheckCheck size={15} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xl font-semibold text-emerald-700 leading-none tabular-nums" style={{ fontFamily: 'var(--font-syne)' }}>{checkedIn}</div>
                      <div className="text-[9px] tracking-[0.25em] text-[#7a4a4a]/50 mt-0.5">CHECK-IN</div>
                    </div>
                  </div>
                  {total > 0 && (
                    <>
                      <div className="h-8 w-px bg-[#eddada]" />
                      <div>
                        <div className="text-xl font-semibold text-[#7a4a4a]/50 leading-none tabular-nums" style={{ fontFamily: 'var(--font-syne)' }}>
                          {Math.round((checkedIn / total) * 100)}%
                        </div>
                        <div className="text-[9px] tracking-[0.25em] text-[#7a4a4a]/50 mt-0.5">PRESENTI</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-[#f0e4e4] bg-white shrink-0">
                {(['guests', 'partners'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-[9px] tracking-[0.4em] uppercase transition-colors ${
                      activeTab === tab
                        ? 'text-[#731515] border-b-2 border-[#731515]'
                        : 'text-[#7a4a4a]/40 hover:text-[#731515]/60'
                    }`}
                  >
                    {tab === 'guests' ? 'Ospiti' : 'Partner'}
                  </button>
                ))}
              </div>

              {/* ── Guests tab ── */}
              {activeTab === 'guests' && (
                <>
                  {/* Search */}
                  <div className="px-5 py-3 border-b border-[#f0e4e4] bg-[#fdf9f9] shrink-0">
                    <div className="flex items-center gap-2 bg-white border border-[#eddada] rounded-xl px-4 py-2.5 shadow-[inset_0_1px_3px_rgba(107,26,26,0.04)]">
                      <Search size={13} className="text-[#7a4a4a]/40 shrink-0" />
                      <input
                        type="text"
                        placeholder="Cerca nome, cognome o email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-[13px] text-[#1a0505] placeholder:text-[#7a4a4a]/30 focus:outline-none"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Guest list */}
                  <div className="flex-1 overflow-y-auto bg-white">
                    <AnimatePresence initial={false}>
                      {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                          <Users size={28} className="text-[#eddada] mb-3" />
                          <p className="text-sm text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                            {search ? 'Nessun risultato per questa ricerca.' : 'Nessun iscritto ancora.'}
                          </p>
                        </div>
                      ) : (
                        filtered.map((guest, i) => {
                          const isToggling = toggling.has(guest.id);
                          return (
                            <motion.div
                              key={guest.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.18, delay: i < 20 ? i * 0.025 : 0 }}
                              className={`flex items-center gap-4 px-5 py-3.5 border-b border-[#f5eded] transition-colors ${
                                guest.checked_in ? 'bg-emerald-50/60' : 'hover:bg-[#fdf9f9]'
                              }`}
                            >
                              {/* Check-in button */}
                              <button
                                onClick={() => toggleCheckIn(guest, activeEvent.slug)}
                                disabled={isToggling}
                                className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                                  guest.checked_in
                                    ? 'bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.30)] hover:bg-emerald-600'
                                    : 'border-2 border-[#eddada] text-[#7a4a4a]/30 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                                } ${isToggling ? 'opacity-50' : ''}`}
                                style={{ touchAction: 'manipulation' }}
                              >
                                {isToggling
                                  ? <Loader2 size={15} className="animate-spin" />
                                  : guest.checked_in
                                    ? <Check size={19} strokeWidth={2.5} />
                                    : <Check size={17} strokeWidth={1.5} className="opacity-50" />
                                }
                              </button>

                              {/* Guest info */}
                              <div className="flex-1 min-w-0">
                                <div className={`text-[14px] font-medium leading-tight truncate ${
                                  guest.checked_in ? 'text-[#1a0505]' : 'text-[#3a2020]/75'
                                }`} style={{ fontFamily: 'var(--font-syne)' }}>
                                  {guest.last_name} {guest.first_name}
                                </div>
                                <div className="text-[11px] text-[#7a4a4a]/50 truncate mt-0.5">
                                  {guest.email}
                                </div>
                              </div>

                              {/* Status badge */}
                              {guest.checked_in && (
                                <div className="shrink-0 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                                  <span className="text-[9px] tracking-[0.3em] text-emerald-700 font-semibold">IN</span>
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* ── Partners tab (read-only) ── */}
              {activeTab === 'partners' && (
                <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 bg-[#fdf9f9]">
                  {partnerLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
                    </div>
                  ) : partners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <Link2 size={28} className="text-[#eddada]" strokeWidth={1.5} />
                      <p className="text-sm text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Nessun partner ancora.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-[#eddada] rounded-xl p-4 text-center">
                          <div className="text-2xl font-light text-[#1a0505] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                            {partners.length}
                          </div>
                          <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 mt-2">PARTNER</div>
                        </div>
                        <div className="bg-white border border-[#eddada] rounded-xl p-4 text-center">
                          <div className="text-2xl font-light text-[#1a0505] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                            {partners.reduce((s, p) => s + p.total_registered, 0)}
                          </div>
                          <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 mt-2">DA PARTNER</div>
                        </div>
                        <div className="bg-white border border-[#eddada] rounded-xl p-4 text-center">
                          <div className="text-2xl font-light text-[#731515] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                            {eventTotal > 0
                              ? `${Math.round((partners.reduce((s, p) => s + p.total_registered, 0) / eventTotal) * 100)}%`
                              : '—'}
                          </div>
                          <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 mt-2">% TOTALE</div>
                        </div>
                        <div className="bg-white border border-[#eddada] rounded-xl p-4 text-center">
                          <div className="text-2xl font-light text-[#1a0505] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                            {eventTotal - partners.reduce((s, p) => s + p.total_registered, 0)}
                          </div>
                          <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 mt-2">DIRETTI</div>
                        </div>
                      </div>

                      {/* Per-partner rows */}
                      <div className="flex flex-col gap-2">
                        <div className="text-[9px] tracking-[0.4em] text-[#7a4a4a]/40 uppercase mb-1">Dettaglio per partner</div>
                        {partners.map(p => {
                          const pct = eventTotal > 0 ? Math.round((p.total_registered / eventTotal) * 100) : 0;
                          return (
                            <div
                              key={p.id}
                              className="bg-white border border-[#eddada] rounded-xl px-4 py-3.5 flex items-center gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-[#1a0505] truncate" style={{ fontFamily: 'var(--font-syne)' }}>
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-[#7a4a4a]/40 font-mono mt-0.5">{p.code}</div>
                              </div>
                              <div className="flex items-center gap-5 shrink-0">
                                <div className="text-center">
                                  <div className="text-lg font-light text-[#1a0505] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                                    {p.total_registered}
                                  </div>
                                  <div className="text-[8px] tracking-[0.25em] text-[#7a4a4a]/40 mt-0.5">ISC</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-light text-emerald-700 leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                                    {p.total_checkedin}
                                  </div>
                                  <div className="text-[8px] tracking-[0.25em] text-[#7a4a4a]/40 mt-0.5">IN</div>
                                </div>
                                <div className="text-center min-w-[38px]">
                                  <div className="text-[13px] font-semibold text-[#731515]">{pct}%</div>
                                  {p.total_registered > 0 && (
                                    <div className="w-10 h-1 bg-[#eddada] rounded-full overflow-hidden mt-1 mx-auto">
                                      <div className="h-full bg-[#731515] rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-[#7a4a4a]/35" style={{ fontFamily: 'var(--font-nunito)' }}>
                        Dati in tempo reale · Solo visualizzazione
                      </p>
                    </>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#f0e4e4] bg-white shrink-0">
        <div className="flex items-center justify-center gap-1">
          <span className="text-[8px] tracking-[0.4em] text-[#7a4a4a]/30 uppercase">Vivo Wine Club</span>
          <Link href="/" className="text-[8px] text-[#7a4a4a]/25 hover:text-[#731515] transition-colors ml-2">↗ vivowineclub.com</Link>
        </div>
      </div>

    </div>
  );
}
