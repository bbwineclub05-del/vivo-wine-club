'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Users, CheckCheck, Phone, Mail,
  UserCheck, Clock, Plus, X, Loader2, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Guest {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  phone:      string | null;
  checked_in: boolean;
  created_at: string;
}

interface Props {
  event: {
    id:                 string;
    slug:               string;
    title:              string;
    guest_list_enabled: boolean;
  };
  accessToken:    string;
  onGuestEnabled: () => void; // reload parent list after enabling
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function EventGuestPanel({ event, accessToken, onGuestEnabled }: Props) {
  const [guests,        setGuests]        = useState<Guest[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [enabling,      setEnabling]      = useState(false);
  const [delConfirm,    setDelConfirm]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [search,        setSearch]        = useState('');
  const [toggling,      setToggling]      = useState<string | null>(null);
  const loadRef = useRef<() => void>(() => {});

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

  useEffect(() => {
    if (event.guest_list_enabled) load();
  }, [event.guest_list_enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Realtime ── */
  useEffect(() => {
    if (!event.guest_list_enabled) return;
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel(`event_guests_panel_${event.slug}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'event_guests',
        filter: `event_slug=eq.${event.slug}`,
      }, () => { loadRef.current(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accessToken, event.slug, event.guest_list_enabled]);

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
        onGuestEnabled(); // reloads parent — guest_list_enabled will now be false
      }
    } catch (err) {
      console.error('[EventGuestPanel] delete error', err);
    } finally {
      setDeleting(false);
    }
  }

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
      console.error('[EventGuestPanel] toggle error', err);
    } finally {
      setToggling(null);
    }
  }

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

  const checkedIn = guests.filter(g => g.checked_in).length;

  /* ── Not active yet ── */
  if (!event.guest_list_enabled) {
    return (
      <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
        <Users size={28} className="text-[#eddada]" />
        <p className="text-sm text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
          Nessuna lista creata per questo evento.
        </p>
        <button
          onClick={enableGuestList}
          disabled={enabling}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#9b2323] disabled:opacity-50 transition-colors rounded-lg"
        >
          {enabling ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          {enabling ? 'ATTIVAZIONE…' : 'CREA LISTA INVITATI'}
        </button>
        <p className="text-[10px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
          Una volta attivata, il form di iscrizione apparirà sulla pagina pubblica dell&apos;evento.
        </p>
      </div>
    );
  }

  /* ── Active ── */
  return (
    <div>
      {/* Delete confirmation banner */}
      <AnimatePresence>
        {delConfirm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border-b border-red-200 flex-wrap">
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

      {/* Counters + search */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#f0e4e4] flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-[#731515]" />
            <span className="text-[12px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
              <strong>{guests.length}</strong>
              <span className="text-[#7a4a4a]/60 ml-1">{guests.length === 1 ? 'iscritto' : 'iscritti'}</span>
            </span>
          </div>
          <span className="text-[#eddada] text-xs">·</span>
          <div className="flex items-center gap-1.5">
            <CheckCheck size={12} className="text-emerald-600" />
            <span className="text-[12px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
              <strong className="text-emerald-700">{checkedIn}</strong>
              <span className="text-[#7a4a4a]/60 ml-1">{checkedIn === 1 ? 'presente' : 'presenti'}</span>
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#fdf6f6] border border-[#eddada] rounded-lg px-3 py-1.5">
          <Search size={11} className="text-[#7a4a4a]/40 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca…"
            className="bg-transparent text-sm text-[#1a0505] placeholder:text-[#7a4a4a]/30 focus:outline-none w-28"
            style={{ fontFamily: 'var(--font-nunito)', fontSize: '14px' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
              <X size={10} />
            </button>
          )}
        </div>

        {/* Delete list */}
        <button
          onClick={() => setDelConfirm(x => !x)}
          title="Elimina lista"
          className={`shrink-0 p-2 rounded-lg transition-colors ${
            delConfirm
              ? 'text-red-600 bg-red-50'
              : 'text-[#7a4a4a]/35 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users size={22} className="text-[#eddada] mb-2" />
          <p className="text-sm text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
            {search ? 'Nessun risultato.' : 'Nessun iscritto ancora.'}
          </p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {filtered.map((guest, i) => (
            <motion.div
              key={guest.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i < 8 ? i * 0.025 : 0 }}
              className={`flex items-center gap-3 px-5 py-3 border-b border-[#f5eded] last:border-0 transition-colors ${
                guest.checked_in ? 'bg-emerald-50/50' : 'hover:bg-[#fdf9f9]'
              }`}
            >
              {/* Number */}
              <span
                className="text-[10px] text-[#7a4a4a]/30 w-5 text-right shrink-0 tabular-nums"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {guests.indexOf(guest) + 1}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[14px] font-medium leading-tight ${guest.checked_in ? 'text-emerald-800' : 'text-[#1a0505]'}`}
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {guest.first_name} {guest.last_name}
                  {guest.checked_in && (
                    <span className="ml-2 text-[8px] tracking-[0.25em] text-emerald-600 font-normal">✓ PRESENTE</span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
                    <Mail size={8} className="shrink-0" />{guest.email}
                  </span>
                  {guest.phone && (
                    <span className="flex items-center gap-1 text-[10px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
                      <Phone size={8} className="shrink-0" />{guest.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[9px] text-[#7a4a4a]/35" style={{ fontFamily: 'var(--font-nunito)' }}>
                    <Clock size={8} className="shrink-0" />{fmtTime(guest.created_at)}
                  </span>
                </div>
              </div>

              {/* Check-in toggle */}
              <button
                onClick={() => toggleCheckIn(guest)}
                disabled={toggling === guest.id}
                title={guest.checked_in ? 'Rimuovi presenza' : 'Segna come presente'}
                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  guest.checked_in
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'border border-[#e8d5d5] text-[#7a4a4a]/40 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {toggling === guest.id
                  ? <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : <UserCheck size={14} />}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
