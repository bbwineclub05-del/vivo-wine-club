'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, CheckCheck, Check, Loader2, LogOut, Wine, ChevronDown } from 'lucide-react';
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

interface Props {
  token:    string;
  onLogout: () => void;
  name:     string;
}

export default function CollaboratorView({ token, onLogout, name }: Props) {
  const [events,     setEvents]     = useState<EventData[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [toggling,   setToggling]   = useState<Set<string>>(new Set());
  const [search,     setSearch]     = useState('');

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

  function sortGuests(a: Guest, b: Guest) {
    const la = a.last_name.toLowerCase(), lb = b.last_name.toLowerCase();
    if (la !== lb) return la < lb ? -1 : 1;
    return a.first_name.toLowerCase() < b.first_name.toLowerCase() ? -1 : 1;
  }

  async function toggleCheckIn(guest: Guest, eventSlug: string) {
    if (toggling.has(guest.id)) return;

    // Optimistic
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
      <div className="min-h-screen bg-[#0d0000] flex items-center justify-center">
        <Loader2 size={28} className="text-[#c84040] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0000] text-white flex flex-col" style={{ fontFamily: 'var(--font-nunito)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobianco.png" alt="Vivo" className="h-6 opacity-75" />
          <span className="text-[8px] tracking-[0.5em] text-white/25 uppercase hidden sm:block">Collaboratore</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/35 hidden sm:block">{name}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1"
          >
            <LogOut size={12} />
            Esci
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center">
            <Wine size={22} className="text-white/20" />
          </div>
          <p className="text-[9px] tracking-[0.5em] text-white/25 uppercase">Nessun evento assegnato</p>
          <p className="text-sm text-white/30 max-w-xs leading-relaxed">
            Non ti è stato ancora assegnato nessun evento. Contatta l'amministratore.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Event selector (if multiple) */}
          {events.length > 1 && (
            <div className="px-4 py-3 border-b border-white/[0.07] shrink-0">
              <div className="relative inline-block w-full max-w-sm">
                <select
                  value={activeSlug ?? ''}
                  onChange={e => { setActiveSlug(e.target.value); setSearch(''); }}
                  className="w-full appearance-none bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-white/80 pr-8 cursor-pointer focus:outline-none focus:border-[#c84040]/50"
                >
                  {events.map(ev => (
                    <option key={ev.slug} value={ev.slug}>{ev.title}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
            </div>
          )}

          {activeEvent && (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Event info + counters */}
              <div className="px-4 py-4 border-b border-white/[0.07] shrink-0">
                {events.length === 1 && (
                  <div className="mb-3">
                    <div className="text-[9px] tracking-[0.5em] text-[#c84040] mb-1">EVENTO</div>
                    <div
                      className="text-[18px] font-light leading-tight text-white/90"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {activeEvent.title}
                    </div>
                    <div className="text-[11px] text-white/30 mt-1">
                      {activeEvent.date && new Date(activeEvent.date).toLocaleDateString('it-IT', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {activeEvent.location && ` · ${activeEvent.location}`}
                    </div>
                  </div>
                )}

                {/* Counters */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
                      <Users size={14} className="text-white/40" />
                    </div>
                    <div>
                      <div className="text-xl font-light text-white leading-none">{total}</div>
                      <div className="text-[9px] tracking-[0.25em] text-white/30 mt-0.5">ISCRITTI</div>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/[0.07]" />
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/[0.12] flex items-center justify-center">
                      <CheckCheck size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xl font-light text-emerald-400 leading-none">{checkedIn}</div>
                      <div className="text-[9px] tracking-[0.25em] text-white/30 mt-0.5">CHECK-IN</div>
                    </div>
                  </div>
                  {total > 0 && (
                    <>
                      <div className="h-8 w-px bg-white/[0.07]" />
                      <div>
                        <div className="text-xl font-light text-white/50 leading-none">
                          {Math.round((checkedIn / total) * 100)}%
                        </div>
                        <div className="text-[9px] tracking-[0.25em] text-white/30 mt-0.5">PRESENTI</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-white/[0.07] shrink-0">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type="text"
                    placeholder="Cerca nome, cognome o email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-8 pr-4 py-2.5 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#c84040]/40 transition-colors"
                  />
                </div>
              </div>

              {/* Guest list */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <p className="text-[9px] tracking-[0.4em] text-white/20 uppercase">
                        {search ? 'Nessun risultato' : 'Nessun iscritto'}
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
                          className={`flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] transition-colors ${
                            guest.checked_in ? 'bg-emerald-500/[0.04]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Check-in button */}
                          <button
                            onClick={() => toggleCheckIn(guest, activeEvent.slug)}
                            disabled={isToggling}
                            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                              guest.checked_in
                                ? 'bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)] hover:bg-emerald-600'
                                : 'border-2 border-white/[0.12] text-white/20 hover:border-emerald-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                            } ${isToggling ? 'opacity-50' : ''}`}
                            style={{ touchAction: 'manipulation' }}
                          >
                            {isToggling
                              ? <Loader2 size={16} className="animate-spin" />
                              : guest.checked_in
                                ? <Check size={20} strokeWidth={2.5} />
                                : <Check size={18} strokeWidth={1.5} className="opacity-40" />
                            }
                          </button>

                          {/* Guest info */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-[14px] font-medium leading-tight truncate ${
                              guest.checked_in ? 'text-white/90' : 'text-white/70'
                            }`}>
                              {guest.last_name} {guest.first_name}
                            </div>
                            <div className="text-[11px] text-white/30 truncate mt-0.5">
                              {guest.email}
                            </div>
                          </div>

                          {/* Status badge */}
                          {guest.checked_in && (
                            <div className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                              <span className="text-[9px] tracking-[0.3em] text-emerald-400">IN</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.07] shrink-0">
        <div className="flex items-center justify-center gap-1">
          <span className="text-[8px] tracking-[0.4em] text-white/15 uppercase">Vivo Wine Club</span>
          <Link href="/" className="text-[8px] text-white/10 hover:text-white/25 transition-colors ml-2">↗ vivowineclub.com</Link>
        </div>
      </div>

    </div>
  );
}
