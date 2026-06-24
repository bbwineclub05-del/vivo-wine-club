'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Users, CheckCheck, Phone, Mail,
  Check, Clock, Plus, X, Loader2, Trash2, Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Guest {
  id:           string;
  first_name:   string;
  last_name:    string;
  email:        string;
  phone:        string | null;
  checked_in:   boolean;
  checked_in_at?: string | null;
  created_at:   string;
  referral_reward_unlocked?: boolean;
  referral_reward_code?:     string | null;
}

interface Props {
  event: {
    id:                 string;
    slug:               string;
    title:              string;
    guest_list_enabled: boolean;
  };
  accessToken:    string;
  onGuestEnabled: () => void;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function EventGuestPanel({ event, accessToken, onGuestEnabled }: Props) {
  const [guests,     setGuests]     = useState<Guest[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [enabling,   setEnabling]   = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [search,     setSearch]     = useState('');
  const [toggling,   setToggling]   = useState<Set<string>>(new Set());

  /* ── Initial load ── */
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

  useEffect(() => {
    if (event.guest_list_enabled) load();
  }, [event.guest_list_enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Realtime — handle payload directly, no full re-fetch ── */
  useEffect(() => {
    if (!event.guest_list_enabled) return;

    supabase.realtime.setAuth(accessToken);

    const channel = supabase
      .channel(`event_guests_modal_${event.slug}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event:  '*',
          schema: 'public',
          table:  'event_guests',
          filter: `event_slug=eq.${event.slug}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newGuest = payload.new as Guest;
            setGuests(prev => {
              if (prev.some(g => g.id === newGuest.id)) return prev;
              return [...prev, newGuest];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Guest;
            setGuests(prev =>
              prev.map(g => g.id === updated.id ? { ...g, ...updated } : g)
            );
            // Clear toggling state if it was set by this device
            setToggling(prev => {
              const next = new Set(prev);
              next.delete(updated.id);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setGuests(prev => prev.filter(g => g.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [accessToken, event.slug, event.guest_list_enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Enable list ── */
  async function enableGuestList() {
    setEnabling(true);
    try {
      const res = await fetch(`/api/events/${event.slug}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ guest_list_enabled: true }),
      });
      if (res.ok) onGuestEnabled();
    } catch (err) {
      console.error('[EventGuestPanel] enable error', err);
    } finally {
      setEnabling(false);
    }
  }

  /* ── Delete list ── */
  async function deleteGuestList() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/guests`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setDelConfirm(false);
        onGuestEnabled();
      }
    } catch (err) {
      console.error('[EventGuestPanel] delete error', err);
    } finally {
      setDeleting(false);
    }
  }

  /* ── Check-in toggle ── */
  async function toggleCheckIn(guest: Guest) {
    if (toggling.has(guest.id)) return; // debounce concurrent taps
    setToggling(prev => new Set(prev).add(guest.id));

    // Optimistic update — realtime will confirm (and clear toggling)
    setGuests(prev =>
      prev.map(g => g.id === guest.id ? { ...g, checked_in: !g.checked_in } : g)
    );

    try {
      await fetch(`/api/events/${event.slug}/guests/${guest.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ checked_in: !guest.checked_in }),
      });
      // Realtime UPDATE will fire and clear toggling; if realtime is slow, clear here too
    } catch (err) {
      console.error('[EventGuestPanel] toggle error', err);
      // Revert optimistic update on error
      setGuests(prev =>
        prev.map(g => g.id === guest.id ? { ...g, checked_in: guest.checked_in } : g)
      );
    } finally {
      // Safety clear — realtime should have already cleared it, but just in case
      setTimeout(() => {
        setToggling(prev => {
          const next = new Set(prev);
          next.delete(guest.id);
          return next;
        });
      }, 2000);
    }
  }

  /* ── Derived state ── */
  const filtered = guests
    .filter(g => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q)  ||
        g.email.toLowerCase().includes(q)      ||
        (g.phone ?? '').includes(q)
      );
    })
    .sort((a, b) =>
      a.last_name.localeCompare(b.last_name, 'it', { sensitivity: 'base' }) ||
      a.first_name.localeCompare(b.first_name, 'it', { sensitivity: 'base' })
    );

  const checkedIn = guests.filter(g => g.checked_in).length;

  /* ── Not active yet ── */
  if (!event.guest_list_enabled) {
    return (
      <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#fdf6f6] flex items-center justify-center">
          <Users size={28} className="text-[#eddada]" />
        </div>
        <div>
          <p className="text-base font-light text-[#1a0505] mb-1" style={{ fontFamily: 'var(--font-syne)' }}>
            Nessuna lista creata
          </p>
          <p className="text-sm text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
            Attiva la lista per raccogliere iscrizioni sulla pagina pubblica.
          </p>
        </div>
        <button
          onClick={enableGuestList}
          disabled={enabling}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] disabled:opacity-50 transition-colors rounded-lg"
        >
          {enabling ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {enabling ? 'ATTIVAZIONE…' : 'CREA LISTA INVITATI'}
        </button>
      </div>
    );
  }

  /* ── Active ── */
  return (
    <div className="flex flex-col h-full">

      {/* Delete confirmation banner */}
      <AnimatePresence>
        {delConfirm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-200 flex-wrap">
              <p className="flex-1 text-sm text-red-700" style={{ fontFamily: 'var(--font-nunito)' }}>
                Eliminare la lista? Tutti gli iscritti verranno rimossi e il form sparirà dal sito.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={deleteGuestList}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[10px] tracking-[0.25em] rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  {deleting ? 'ELIMINAZIONE…' : 'ELIMINA'}
                </button>
                <button
                  onClick={() => setDelConfirm(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 border border-red-200 text-red-600 text-[10px] tracking-[0.25em] rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  ANNULLA
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Counters + search bar — sticky */}
      <div className="shrink-0 px-6 py-4 border-b border-[#f0e4e4] bg-[#fdf9f9]">
        {/* Counters row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#731515]/8 flex items-center justify-center">
              <Users size={14} className="text-[#731515]" />
            </div>
            <div>
              <span className="text-xl font-semibold text-[#1a0505] leading-none tabular-nums" style={{ fontFamily: 'var(--font-syne)' }}>
                {guests.length}
              </span>
              <span className="text-[11px] text-[#7a4a4a]/60 ml-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                {guests.length === 1 ? 'iscritto' : 'iscritti'}
              </span>
            </div>
          </div>
          <div className="w-px h-6 bg-[#eddada]" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCheck size={14} className="text-emerald-600" />
            </div>
            <div>
              <span className="text-xl font-semibold text-emerald-700 leading-none tabular-nums" style={{ fontFamily: 'var(--font-syne)' }}>
                {checkedIn}
              </span>
              <span className="text-[11px] text-[#7a4a4a]/60 ml-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                {checkedIn === 1 ? 'presente' : 'presenti'}
              </span>
            </div>
          </div>
          <div className="flex-1" />
          {/* Delete list */}
          <button
            onClick={() => setDelConfirm(x => !x)}
            title="Elimina lista"
            className={`p-2 rounded-lg transition-colors ${
              delConfirm ? 'text-red-600 bg-red-50' : 'text-[#7a4a4a]/35 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-[#eddada] rounded-xl px-4 py-2.5 shadow-[inset_0_1px_3px_rgba(107,26,26,0.04)]">
          <Search size={14} className="text-[#7a4a4a]/40 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, cognome o email…"
            className="flex-1 bg-transparent text-sm text-[#1a0505] placeholder:text-[#7a4a4a]/30 focus:outline-none"
            style={{ fontFamily: 'var(--font-nunito)', fontSize: '15px' }}
            autoComplete="off"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users size={28} className="text-[#eddada] mb-3" />
            <p className="text-sm text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
              {search ? 'Nessun risultato per questa ricerca.' : 'Nessun iscritto ancora.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((guest, i) => {
              const isToggling = toggling.has(guest.id);
              return (
                <motion.div
                  key={guest.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: i < 10 ? i * 0.018 : 0 }}
                  className={`flex items-center gap-4 px-6 py-3.5 border-b border-[#f5eded] last:border-0 transition-colors duration-200 ${
                    guest.checked_in ? 'bg-emerald-50/60' : 'hover:bg-[#fdf9f9]'
                  }`}
                >
                  {/* Position number */}
                  <span
                    className="text-[11px] text-[#7a4a4a]/25 w-6 text-right shrink-0 tabular-nums select-none"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {i + 1}
                  </span>

                  {/* Guest info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-[15px] font-medium leading-tight truncate ${
                          guest.checked_in ? 'text-emerald-800' : 'text-[#1a0505]'
                        }`}
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {guest.last_name} {guest.first_name}
                      </p>
                      {guest.referral_reward_unlocked && (
                        <span
                          title={`Reward sbloccato${guest.referral_reward_code ? ` — ${guest.referral_reward_code}` : ''}`}
                          className="shrink-0"
                        >
                          <Star size={13} className="text-amber-500 fill-amber-400" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-[#7a4a4a]/55" style={{ fontFamily: 'var(--font-nunito)' }}>
                        <Mail size={9} className="shrink-0" />{guest.email}
                      </span>
                      {guest.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-[#7a4a4a]/55" style={{ fontFamily: 'var(--font-nunito)' }}>
                          <Phone size={9} className="shrink-0" />{guest.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-[#7a4a4a]/30" style={{ fontFamily: 'var(--font-nunito)' }}>
                        <Clock size={8} className="shrink-0" />{fmtTime(guest.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Check-in button — large circular, touch-friendly */}
                  <button
                    onClick={() => toggleCheckIn(guest)}
                    disabled={isToggling}
                    title={guest.checked_in ? 'Rimuovi presenza' : 'Segna come presente'}
                    className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-250 select-none ${
                      guest.checked_in
                        ? 'bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-95'
                        : 'border-2 border-[#ddd] text-[#bbb] hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 active:scale-95'
                    } disabled:cursor-not-allowed`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {isToggling ? (
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : guest.checked_in ? (
                      <Check size={20} strokeWidth={2.5} />
                    ) : (
                      <Check size={18} strokeWidth={1.5} className="opacity-30" />
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
