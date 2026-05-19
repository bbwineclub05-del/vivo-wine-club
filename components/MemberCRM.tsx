'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Mail, CalendarPlus, X, Search, RefreshCw,
  ChevronDown, ChevronUp, Send, Check, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Types ── */
interface Member {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_sign_in: string | null;
  tier: string;
  events: string[];
  tickets: number;
  spend: number;
}

type SortKey = 'name' | 'created_at' | 'tickets' | 'spend';
type SortDir = 'asc' | 'desc';

/* ── Helpers ── */
function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const inputClass =
  'w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm placeholder-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200';

/* ── Communication modal ── */
function CommunicationModal({
  recipients,
  onClose,
}: {
  recipients: Member[];
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body,    setBody]    = useState('');
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [result,  setResult]  = useState<{ sent: number; failed: number } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/crm/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:       'custom',
          recipients: recipients.map((m) => ({ email: m.email, name: m.name })),
          subject,
          text:       body,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult({ sent: json.sent, failed: json.failed });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-[#e8d5d5] flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-1">INVIA COMUNICAZIONE</div>
            <p className="text-xs text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
              {recipients.length} destinatari selezionati
            </p>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors">
            <X size={18} />
          </button>
        </div>

        {status === 'done' ? (
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <Check size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-base font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                Mail inviate con successo
              </p>
              <p className="text-sm text-[#7a4a4a] mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                {result?.sent} inviate · {result?.failed} fallite
              </p>
            </div>
            <button onClick={onClose} className="text-[9px] tracking-[0.3em] text-white bg-[#731515] px-6 py-3 hover:bg-[#aa4848] transition-colors">
              CHIUDI
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <AlertCircle size={32} className="text-[#731515]" />
            <p className="text-sm text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Errore nell&apos;invio. Riprova.
            </p>
            <button onClick={() => setStatus('idle')} className="text-[9px] tracking-[0.3em] text-[#731515] border border-[#731515]/30 px-5 py-2.5">
              RIPROVA
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
            {/* Recipient chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-3 bg-[#fdf6f6] border border-[#e8d5d5]">
              {recipients.slice(0, 20).map((m) => (
                <span key={m.id} className="text-[9px] tracking-[0.1em] px-2 py-1 bg-[#731515]/8 text-[#731515]">
                  {m.name}
                </span>
              ))}
              {recipients.length > 20 && (
                <span className="text-[9px] text-[#7a4a4a]/50 px-2 py-1">
                  +{recipients.length - 20} altri
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] tracking-[0.3em] text-[#731515]">OGGETTO *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Es. Nuovo evento: Wine Lounge — Milano"
                className={inputClass}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] tracking-[0.3em] text-[#731515]">TESTO *</label>
              <textarea
                required
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"Ciao,\n\nScriviamo per informarti di…\n\nA presto,\nIl team di Vivo Wine Club"}
                className={`${inputClass} resize-none`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
              <p className="text-[9px] text-[#7a4a4a]/40">Il testo viene convertito automaticamente in HTML con lo stile Vivo Wine Club.</p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose}
                className="text-[9px] tracking-[0.3em] text-[#7a4a4a] border border-[#e8d5d5] px-5 py-3 hover:text-[#731515] transition-colors">
                ANNULLA
              </button>
              <button type="submit" disabled={status === 'sending'}
                className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] px-6 py-3 hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                <Send size={11} />
                {status === 'sending' ? `INVIO IN CORSO… (${recipients.length})` : `INVIA A ${recipients.length} MEMBRI`}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ── Event email modal ── */
function EventEmailModal({
  recipients,
  onClose,
}: {
  recipients: Member[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    eventTitle:       '',
    eventDate:        '',
    eventLocation:    '',
    eventDescription: '',
    ctaText:          'SCOPRI L\'EVENTO',
    ctaLink:          'https://vivowineclub.com/events',
  });
  const [status, setStatus]  = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [result, setResult]  = useState<{ sent: number; failed: number } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/crm/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:        'event',
          recipients:  recipients.map((m) => ({ email: m.email, name: m.name })),
          subject:     `Nuovo evento: ${form.eventTitle} — Vivo Wine Club`,
          eventParams: form,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult({ sent: json.sent, failed: json.failed });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-[#e8d5d5] flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-1">ANNUNCIO NUOVO EVENTO</div>
            <p className="text-xs text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
              Verrà inviata a {recipients.length} membri con il template Vivo Wine Club
            </p>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors">
            <X size={18} />
          </button>
        </div>

        {status === 'done' ? (
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <Check size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-base font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                Email evento inviata!
              </p>
              <p className="text-sm text-[#7a4a4a] mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                {result?.sent} inviate · {result?.failed} fallite
              </p>
            </div>
            <button onClick={onClose} className="text-[9px] tracking-[0.3em] text-white bg-[#731515] px-6 py-3 hover:bg-[#aa4848] transition-colors">
              CHIUDI
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <AlertCircle size={32} className="text-[#731515]" />
            <p className="text-sm text-[#731515]">Errore nell&apos;invio. Riprova.</p>
            <button onClick={() => setStatus('idle')} className="text-[9px] tracking-[0.3em] text-[#731515] border border-[#731515]/30 px-5 py-2.5">
              RIPROVA
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-[9px] tracking-[0.3em] text-[#731515]">NOME EVENTO *</label>
                <input type="text" required value={form.eventTitle} onChange={set('eventTitle')}
                  placeholder="Wine Lounge · Milano" className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] tracking-[0.3em] text-[#731515]">DATA *</label>
                <input type="text" required value={form.eventDate} onChange={set('eventDate')}
                  placeholder="15 June 2026" className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] tracking-[0.3em] text-[#731515]">LOCATION *</label>
                <input type="text" required value={form.eventLocation} onChange={set('eventLocation')}
                  placeholder="Milano, Italy" className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] tracking-[0.3em] text-[#731515]">DESCRIZIONE *</label>
              <textarea required rows={5} value={form.eventDescription} onChange={set('eventDescription')}
                placeholder={"Siamo felici di annunciare…\n\nSaranno presenti..."}
                className={`${inputClass} resize-none`} style={{ fontFamily: 'var(--font-nunito)' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] tracking-[0.3em] text-[#731515]">TESTO PULSANTE</label>
                <input type="text" value={form.ctaText} onChange={set('ctaText')}
                  className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] tracking-[0.3em] text-[#731515]">LINK PULSANTE</label>
                <input type="url" value={form.ctaLink} onChange={set('ctaLink')}
                  className={inputClass} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose}
                className="text-[9px] tracking-[0.3em] text-[#7a4a4a] border border-[#e8d5d5] px-5 py-3 hover:text-[#731515] transition-colors">
                ANNULLA
              </button>
              <button type="submit" disabled={status === 'sending'}
                className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] px-6 py-3 hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                <Send size={11} />
                {status === 'sending' ? 'INVIO IN CORSO…' : `INVIA A ${recipients.length} MEMBRI`}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ── Sortable column header ── */
function SortHeader({
  label, k, sort, dir, onSort,
}: {
  label: string; k: SortKey; sort: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = sort === k;
  return (
    <button
      onClick={() => onSort(k)}
      className={`flex items-center gap-1 text-[8px] tracking-[0.25em] transition-colors duration-150 ${
        active ? 'text-[#731515]' : 'text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
      }`}
    >
      {label}
      {active ? (dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : null}
    </button>
  );
}

/* ── Main component ── */
export default function MemberCRM() {
  const [members, setMembers]   = useState<Member[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [search,  setSearch]    = useState('');
  const [sort,    setSort]      = useState<SortKey>('tickets');
  const [dir,     setDir]       = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal,   setModal]     = useState<'comm' | 'event' | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    if (!accessToken) return; // don't fetch until auth session is ready
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/crm/members', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setMembers(json.members ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  // ── Realtime: re-fetch when tickets or members change ────────────────────
  useEffect(() => {
    if (!accessToken) return;
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel('crm_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accessToken, load]);

  /* Sort + filter */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = members.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
    return [...list].sort((a, b) => {
      let diff = 0;
      if (sort === 'name')       diff = a.name.localeCompare(b.name);
      if (sort === 'created_at') diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === 'tickets')    diff = a.tickets - b.tickets;
      if (sort === 'spend')      diff = a.spend - b.spend;
      return dir === 'asc' ? diff : -diff;
    });
  }, [members, search, sort, dir]);

  function handleSort(k: SortKey) {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(k); setDir('desc'); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((m) => m.id)));
  }
  function deselectAll() { setSelected(new Set()); }

  const selectedMembers = members.filter((m) => selected.has(m.id));
  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  /* KPIs */
  const totalSpend = members.reduce((s, m) => s + m.spend, 0);
  const totalTickets = members.reduce((s, m) => s + m.tickets, 0);
  const activeMembers = members.filter((m) => m.tickets > 0).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center shrink-0">
            <Users size={15} className="text-[#731515]" />
          </div>
          <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">CRM MEMBRI</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastRefresh && (
            <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
              {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={load} disabled={loading}
            className="w-7 h-7 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { if (selected.size === 0) selectAll(); setModal('comm'); }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] text-white bg-[#731515] hover:bg-[#aa4848] disabled:opacity-40 px-4 py-2.5 transition-colors"
          >
            <Mail size={11} />
            {selected.size > 0 ? `INVIA A ${selected.size}` : 'INVIA A TUTTI'}
          </button>
          <button
            onClick={() => { if (selected.size === 0) selectAll(); setModal('event'); }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] border border-[#731515]/40 text-[#731515] hover:bg-[#731515]/5 disabled:opacity-40 px-4 py-2.5 transition-colors"
          >
            <CalendarPlus size={11} />
            NUOVO EVENTO
          </button>
        </div>
      </div>

      {/* KPI row */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'TOTALE MEMBRI',   value: members.length },
            { label: 'CON TICKET',      value: activeMembers },
            { label: 'TICKET TOTALI',   value: totalTickets },
            { label: 'REVENUE TOTALE',  value: `€${totalSpend}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#e8d5d5] p-4">
              <div className="text-[8px] tracking-[0.3em] text-[#7a4a4a]/50 mb-1">{label}</div>
              <div className="text-xl font-light text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + select-all */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a4a4a]/40" />
          <input
            type="text"
            placeholder="Cerca per nome o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#e8d5d5] text-[#1a0505] pl-10 pr-4 py-2.5 text-sm placeholder-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors"
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="text-[9px] tracking-[0.2em] text-[#7a4a4a]/60 hover:text-[#731515] transition-colors"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {allSelected ? 'DESELEZIONA TUTTI' : 'SELEZIONA TUTTI'}
            </button>
            {selected.size > 0 && (
              <span className="text-[9px] text-[#731515]">({selected.size} selezionati)</span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {loading && members.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
          Caricamento membri…
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</div>
      ) : members.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
          Nessun membro trovato.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-[#e8d5d5]">
                <th className="pb-3 pr-4 text-left w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={allSelected ? deselectAll : selectAll}
                    className="accent-[#731515] w-3.5 h-3.5"
                  />
                </th>
                <th className="pb-3 pr-4 text-left">
                  <SortHeader label="MEMBRO" k="name" sort={sort} dir={dir} onSort={handleSort} />
                </th>
                <th className="pb-3 pr-4 text-left">
                  <SortHeader label="ISCRITTO" k="created_at" sort={sort} dir={dir} onSort={handleSort} />
                </th>
                <th className="pb-3 pr-4 text-left hidden sm:table-cell">
                  <span className="text-[8px] tracking-[0.25em] text-[#7a4a4a]/50">TIER</span>
                </th>
                <th className="pb-3 pr-4 text-right">
                  <SortHeader label="TICKET" k="tickets" sort={sort} dir={dir} onSort={handleSort} />
                </th>
                <th className="pb-3 text-right">
                  <SortHeader label="SPESA" k="spend" sort={sort} dir={dir} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((m) => (
                  <motion.tr
                    key={m.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => toggleSelect(m.id)}
                    className={`border-b border-[#e8d5d5] cursor-pointer transition-colors duration-150 ${
                      selected.has(m.id) ? 'bg-[#731515]/4' : 'hover:bg-[#fdf6f6]'
                    }`}
                  >
                    <td className="py-3.5 pr-4">
                      <input
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-[#731515] w-3.5 h-3.5"
                      />
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#731515]/8 flex items-center justify-center text-[#731515] text-xs font-medium shrink-0" style={{ fontFamily: 'var(--font-syne)' }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#1a0505] truncate" style={{ fontFamily: 'var(--font-syne)' }}>
                            {m.name}
                          </div>
                          <div className="text-[10px] text-[#7a4a4a]/50 truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                            {m.email}
                          </div>
                          {m.events.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {m.events.map((ev) => (
                                <span key={ev} className="text-[7px] tracking-[0.1em] px-1.5 py-0.5 bg-[#731515]/6 text-[#731515]">
                                  {ev}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="text-xs text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        {fmt(m.created_at)}
                      </div>
                      {m.last_sign_in && (
                        <div className="text-[9px] text-[#7a4a4a]/40 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                          Last: {fmt(m.last_sign_in)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 hidden sm:table-cell">
                      <span className={`text-[8px] tracking-[0.2em] px-2 py-0.5 border ${
                        m.tier === 'Staff'
                          ? 'border-[#731515]/40 text-[#731515] bg-[#731515]/5'
                          : 'border-[#e8d5d5] text-[#7a4a4a]/60'
                      }`}>
                        {m.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                        {m.tickets || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <span className={`text-sm font-medium ${m.spend > 0 ? 'text-[#731515]' : 'text-[#7a4a4a]/30'}`} style={{ fontFamily: 'var(--font-syne)' }}>
                        {m.spend > 0 ? `€${m.spend}` : '—'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && search && (
            <div className="py-8 text-center text-xs text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
              Nessun risultato per &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal === 'comm' && (
          <CommunicationModal
            recipients={selected.size > 0 ? selectedMembers : members}
            onClose={() => setModal(null)}
          />
        )}
        {modal === 'event' && (
          <EventEmailModal
            recipients={selected.size > 0 ? selectedMembers : members}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
