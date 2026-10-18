'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Users, CheckCheck, Phone, Mail, UserCheck, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Guest {
  id:           string;
  first_name:   string;
  last_name:    string;
  email:        string;
  phone:        string | null;
  checked_in:   boolean;
  created_at:   string;
  route_option: string | null;
}

interface Props {
  event:       { id: string; slug: string; title: string };
  accessToken: string;
  onClose:     () => void;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function EventGuestList({ event, accessToken, onClose }: Props) {
  const [guests,  setGuests]  = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const loadRef = useRef<() => void>(() => {});

  /* ── Lock body scroll while modal is open ── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ── Load guests ── */
  function load() {
    setLoading(true);
    fetch(`/api/events/${event.slug}/guests`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(j => setGuests(Array.isArray(j.guests) ? j.guests : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  loadRef.current = load;

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Realtime subscription ── */
  useEffect(() => {
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel(`event_guests_${event.slug}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'event_guests',
        filter: `event_slug=eq.${event.slug}`,
      }, () => { loadRef.current(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accessToken, event.slug]);

  /* ── Check-in toggle ── */
  async function toggleCheckIn(guest: Guest) {
    setToggling(guest.id);
    try {
      const res = await fetch(`/api/events/${event.slug}/guests/${guest.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ checked_in: !guest.checked_in }),
      });
      if (res.ok) {
        setGuests(prev =>
          prev.map(g => g.id === guest.id ? { ...g, checked_in: !g.checked_in } : g)
        );
      }
    } catch (err) {
      console.error('[EventGuestList] toggle error', err);
    } finally {
      setToggling(null);
    }
  }

  /* ── Filtered list ── */
  const filtered = guests.filter(g => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.first_name.toLowerCase().includes(q) ||
      g.last_name.toLowerCase().includes(q)  ||
      g.email.toLowerCase().includes(q)      ||
      (g.phone ?? '').includes(q)
    );
  });

  const checkedIn   = guests.filter(g => g.checked_in).length;
  const hasRoutes   = guests.some(g => g.route_option != null);
  const count40km   = guests.filter(g => g.route_option === '40km').length;
  const count80km   = guests.filter(g => g.route_option === '80km').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(90vh, 700px)' }}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit ={{ opacity: 0, scale: 0.95, y: 16  }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-5 border-b border-[var(--color-rule-paper)] shrink-0 bg-white">
          <div>
            <div className="text-[12px] tracking-[0.4em] text-[var(--color-accent)] mb-0.5">LISTA INVITATI</div>
            <h2
              className="text-lg font-light text-[var(--color-ink)] leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {event.title}
            </h2>

            {/* Counters */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-[var(--color-accent)]" />
                <span className="text-[13px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-geist)' }}>
                  <strong>{guests.length}</strong>
                  <span className="text-[var(--color-on-paper-muted)]/60 ml-1">
                    {guests.length === 1 ? 'iscritto' : 'iscritti'}
                  </span>
                </span>
              </div>
              <span className="text-[var(--color-rule-paper)]">·</span>
              <div className="flex items-center gap-1.5">
                <CheckCheck size={13} className="text-emerald-600" />
                <span className="text-[13px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-geist)' }}>
                  <strong className="text-emerald-700">{checkedIn}</strong>
                  <span className="text-[var(--color-on-paper-muted)]/60 ml-1">
                    {checkedIn === 1 ? 'presente' : 'presenti'}
                  </span>
                </span>
              </div>
              {hasRoutes && (
                <>
                  <span className="text-[var(--color-rule-paper)]">·</span>
                  <span className="text-[13px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-geist)' }}>
                    <strong>{count40km}</strong>
                    <span className="text-[var(--color-on-paper-muted)]/60 ml-1">× 40 km</span>
                  </span>
                  <span className="text-[var(--color-rule-paper)]">·</span>
                  <span className="text-[13px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-geist)' }}>
                    <strong>{count80km}</strong>
                    <span className="text-[var(--color-on-paper-muted)]/60 ml-1">× 80 km</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="text-[var(--color-on-paper-muted)]/50 hover:text-[var(--color-accent)] transition-colors rounded-xl hover:bg-[var(--color-paper-soft)] mt-0.5 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="sticky top-[88px] z-10 min-h-[48px] px-6 border-b border-[var(--color-rule-paper)] shrink-0 bg-white">
          <div className="flex items-center gap-2.5 bg-[var(--color-paper-soft)] border border-[var(--color-rule-paper)] rounded-xl px-3 py-2">
            <Search size={13} className="text-[var(--color-on-paper-muted)]/50 shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per nome, email, telefono…"
              className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-on-paper-muted)]/35 focus:outline-none"
              style={{ fontFamily: 'var(--font-geist)', fontSize: '16px' }}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--color-on-paper-muted)]/40 hover:text-[var(--color-accent)] transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={32} className="text-[var(--color-rule-paper)] mb-3" />
              <p className="text-sm text-[var(--color-on-paper-muted)]/50" style={{ fontFamily: 'var(--font-geist)' }}>
                {search ? 'Nessun risultato per questa ricerca.' : 'Nessun iscritto ancora.'}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((guest, i) => (
                <motion.div
                  key={guest.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: i < 10 ? i * 0.03 : 0 }}
                  className={`flex items-center gap-4 px-6 py-4 border-b border-[#f5eded] transition-colors duration-200 ${
                    guest.checked_in ? 'bg-emerald-50/60' : 'hover:bg-[#fdf9f9]'
                  }`}
                >
                  {/* Number */}
                  <span
                    className="text-[13px] text-[var(--color-on-paper-muted)]/30 w-6 text-right shrink-0 tabular-nums"
                    style={{ fontFamily: 'var(--font-geist)' }}
                  >
                    {guests.indexOf(guest) + 1}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[15px] font-medium leading-tight flex flex-wrap items-center gap-2 ${guest.checked_in ? 'text-emerald-800' : 'text-[var(--color-ink)]'}`}
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {guest.first_name} {guest.last_name}
                      {guest.checked_in && (
                        <span className="text-[12px] font-medium tracking-[0.06em] text-emerald-600 font-normal">✓ PRESENTE</span>
                      )}
                      {guest.route_option && (
                        <span
                          className="text-[12px] font-medium px-1.5 py-0.5 rounded-md font-normal bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          style={{ fontFamily: 'var(--font-geist)' }}
                        >
                          {guest.route_option === '40km' ? '40 KM' : '80 KM'}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="flex items-center gap-1 text-[13px] text-[var(--color-on-paper-muted)]/60" style={{ fontFamily: 'var(--font-geist)' }}>
                        <Mail size={9} className="shrink-0" />
                        {guest.email}
                      </span>
                      {guest.phone && (
                        <span className="flex items-center gap-1 text-[13px] text-[var(--color-on-paper-muted)]/60" style={{ fontFamily: 'var(--font-geist)' }}>
                          <Phone size={9} className="shrink-0" />
                          {guest.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[13px] text-[var(--color-on-paper-muted)]/40" style={{ fontFamily: 'var(--font-geist)' }}>
                        <Clock size={9} className="shrink-0" />
                        {fmtTime(guest.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Check-in button */}
                  <button
                    onClick={() => toggleCheckIn(guest)}
                    disabled={toggling === guest.id}
                    title={guest.checked_in ? 'Rimuovi presenza' : 'Segna come presente'}
                    className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      guest.checked_in
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'border border-[var(--color-rule-paper)] text-[var(--color-on-paper-muted)]/40 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {toggling === guest.id ? (
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <UserCheck size={16} />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="min-h-[48px] px-6 border-t border-[var(--color-rule-paper)] shrink-0 bg-[#fdf9f9]">
            <p className="text-[13px] text-[var(--color-on-paper-muted)]/40 text-center" style={{ fontFamily: 'var(--font-geist)' }}>
              Lista aggiornata in tempo reale · Clicca <UserCheck size={9} className="inline mx-0.5" /> per segnare la presenza
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
