'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Mail, Users, X, Check, RefreshCw,
  CheckSquare, Square, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Customer {
  id:                string;
  email:             string;
  name:              string;
  first_purchase_at: string;
  last_purchase_at:  string;
  total_events:      number;
  events:            string[];
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const inputCls =
  'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3 py-2 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

/* ─────────────────────────────────────────────
   Email Compose Modal
───────────────────────────────────────────── */
function ComposeModal({
  recipients,
  onClose,
  accessToken,
}: {
  recipients: Customer[];
  onClose:    () => void;
  accessToken: string;
}) {
  const [subject, setSubject] = useState('');
  const [body,    setBody]    = useState('');
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [result,  setResult]  = useState<{ sent: number; failed: number } | null>(null);

  const previewNames = recipients
    .slice(0, 3)
    .map(r => r.name.split(' ')[0])
    .join(', ');
  const extra = recipients.length > 3 ? ` e altri ${recipients.length - 3}` : '';

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/crm/customers/bulk-email', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipients: recipients.map(r => ({ email: r.email, name: r.name })),
          subject:    subject.trim(),
          text:       body.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eddada]">
          <div>
            <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-0.5">INVIA EMAIL</div>
            <h3 className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {recipients.length === 1 ? recipients[0].name : `${recipients.length} destinatari`}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {status === 'done' ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm text-[#1a0505] font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
              {result?.sent} email inviate con successo
            </p>
            {result?.failed ? (
              <p className="text-xs text-[#731515] mt-1">{result.failed} fallite</p>
            ) : null}
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] transition-colors"
            >
              CHIUDI
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* To */}
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">A</div>
              <div className="text-sm text-[#1a0505] bg-[#fdf6f6] border border-[#eddada] rounded-lg px-3 py-2" style={{ fontFamily: 'var(--font-nunito)' }}>
                {previewNames}{extra}
              </div>
            </div>

            {/* Subject */}
            <div>
              <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">OGGETTO</div>
              <input
                className={inputCls}
                placeholder="Oggetto email..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[9px] tracking-[0.35em] text-[#731515]">MESSAGGIO</div>
                <div className="text-[9px] text-[#7a4a4a]/40">Usa [Nome] per personalizzare</div>
              </div>
              <textarea
                className={`${inputCls} resize-none`}
                rows={7}
                placeholder="Scrivi il messaggio..."
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />
            </div>

            {status === 'error' && (
              <p className="text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                Errore nell&apos;invio. Riprova.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSend}
                disabled={status === 'sending' || !subject.trim() || !body.trim()}
                className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'sending' ? 'INVIO IN CORSO…' : `INVIA A ${recipients.length} DESTINATAR${recipients.length === 1 ? 'IO' : 'I'}`}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.3em] rounded-lg hover:border-[#731515]/40 transition-colors"
              >
                ANNULLA
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Customer row
───────────────────────────────────────────── */
function CustomerRow({
  customer,
  selected,
  onToggle,
  onSendMail,
}: {
  customer:   Customer;
  selected:   boolean;
  onToggle:   () => void;
  onSendMail: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white border rounded-xl shadow-[0_1px_4px_rgba(107,26,26,0.04)] overflow-hidden transition-colors ${selected ? 'border-[#731515]/40' : 'border-[#eddada]'}`}>
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Checkbox */}
        <button onClick={onToggle} className="shrink-0 text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
          {selected
            ? <CheckSquare size={15} className="text-[#731515]" />
            : <Square size={15} />}
        </button>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[#1a0505] truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
            {customer.name || '—'}
          </div>
          <div className="text-[11px] text-[#7a4a4a]/60 truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
            {customer.email}
          </div>
        </div>

        {/* Events count */}
        <div className="shrink-0 text-center hidden sm:block">
          <div className="text-[10px] tracking-[0.25em] text-[#7a4a4a]/40 mb-0.5">EVENTI</div>
          <div className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
            {customer.total_events}
          </div>
        </div>

        {/* Last purchase */}
        <div className="shrink-0 text-right hidden md:block">
          <div className="text-[10px] tracking-[0.25em] text-[#7a4a4a]/40 mb-0.5">ULTIMO</div>
          <div className="text-[11px] text-[#7a4a4a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
            {fmtDate(customer.last_purchase_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onSendMail}
            title="Invia email"
            className="p-2 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
          >
            <Mail size={14} />
          </button>
          {customer.events.length > 0 && (
            <button
              onClick={() => setExpanded(x => !x)}
              className="p-2 rounded-lg text-[#7a4a4a]/50 hover:text-[#1a0505] hover:bg-[#fdf6f6] transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded: event slugs */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-[#eddada]"
          >
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {customer.events.map(slug => (
                <span
                  key={slug}
                  className="inline-block text-[10px] bg-[#731515]/8 text-[#731515] border border-[#731515]/15 px-2.5 py-1 rounded-full"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {slug}
                </span>
              ))}
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
export default function CrmClienti() {
  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [accessToken,  setAccessToken]  = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [composeFor,   setComposeFor]   = useState<Customer[] | null>(null);

  // Fetch access token once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const load = () => {
    if (!accessToken) return;
    setLoading(true);
    fetch('/api/crm/customers', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(j => setCustomers(Array.isArray(j.customers) ? j.customers : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived ── */
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.events.some(e => e.includes(q))
    );
  });

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCount   = customers.filter(c => new Date(c.last_purchase_at).getTime() > thirtyDaysAgo).length;
  const returningCount = customers.filter(c => c.total_events >= 2).length;

  /* ── Selection helpers ── */
  const allFilteredIds   = filtered.map(c => c.id);
  const allSelected      = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected     = allFilteredIds.some(id => selected.has(id));

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  const selectedCustomers = filtered.filter(c => selected.has(c.id));

  return (
    <div>
      {/* Email compose modal */}
      <AnimatePresence>
        {composeFor && accessToken && (
          <ComposeModal
            key="compose"
            recipients={composeFor}
            accessToken={accessToken}
            onClose={() => setComposeFor(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[9px] tracking-[0.42em] text-[#731515] mb-1">ADMIN</div>
          <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
            CRM Clienti
          </h2>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.25em] rounded-lg hover:border-[#731515]/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          AGGIORNA
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Clienti totali',      value: customers.length,  color: 'text-[#731515]' },
          { label: 'Clienti abituali',    value: returningCount,    color: 'text-amber-600'  },
          { label: 'Ultimi 30 giorni',    value: recentCount,       color: 'text-emerald-600'},
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-[#eddada] rounded-xl p-4 shadow-[0_1px_4px_rgba(107,26,26,0.05)]">
            <div className="flex items-center gap-2 mb-1">
              <Users size={13} className={color} />
              <span className="text-[9px] tracking-[0.3em] text-[#7a4a4a]/60">{label.toUpperCase()}</span>
            </div>
            <div className={`text-2xl font-light ${color}`} style={{ fontFamily: 'var(--font-syne)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: search + bulk action */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a4a4a]/40" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Cerca per nome, email o evento…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </div>

        {someSelected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setComposeFor(selectedCustomers)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] transition-colors whitespace-nowrap"
          >
            <Mail size={12} />
            INVIA MAIL ({selectedCustomers.length})
          </motion.button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-[#731515] border-t-transparent animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-[#7a4a4a]/50 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
          <Users size={32} className="mx-auto mb-3 text-[#eddada]" />
          Nessun cliente ancora. I clienti vengono aggiunti automaticamente ad ogni acquisto biglietto.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#7a4a4a]/50 text-sm" style={{ fontFamily: 'var(--font-nunito)' }}>
          Nessun risultato per &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <>
          {/* Select-all row */}
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <button onClick={toggleAll} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors">
              {allSelected
                ? <CheckSquare size={15} className="text-[#731515]" />
                : <Square size={15} />}
            </button>
            <span className="text-[10px] tracking-[0.25em] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
              {allSelected ? 'DESELEZIONA TUTTI' : `SELEZIONA TUTTI (${filtered.length})`}
            </span>
          </div>

          <div className="space-y-2">
            {filtered.map(customer => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                selected={selected.has(customer.id)}
                onToggle={() => toggleOne(customer.id)}
                onSendMail={() => setComposeFor([customer])}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
