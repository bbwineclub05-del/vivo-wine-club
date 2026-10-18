'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, RefreshCw, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Partner {
  id:                string;
  name:              string;
  code:              string;
  created_at:        string;
  total_registered:  number;
  total_checkedin:   number;
}

const BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'https://vivowineclub.com';

function partnerLink(eventSlug: string, code: string) {
  return `${BASE_URL}/events/${eventSlug}?partner=${code}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <button
      onClick={copy}
      title="Copia link"
      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-medium tracking-normal border border-[var(--color-rule-paper)] rounded-xl text-[var(--color-accent)] hover:bg-[var(--color-paper-soft)] transition-colors"
      style={{ fontFamily: 'var(--font-geist)' }}
    >
      {copied
        ? <><Check size={11} className="text-emerald-600" /> COPIATO</>
        : <><Copy size={11} /> COPIA</>
      }
    </button>
  );
}

export default function EventPartnerPanel({
  event,
  accessToken,
}: {
  event: { id: string; slug: string; title: string };
  accessToken: string;
}) {
  const [partners,  setPartners]  = useState<Partner[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [newName,   setNewName]   = useState('');
  const [adding,    setAdding]    = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [addError,  setAddError]  = useState('');

  const authHeader = useCallback(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/partners`, {
        headers: authHeader(),
      });
      const data = await res.json();
      setPartners(data.partners ?? []);
      setEventTotal(data.event_total_registered ?? 0);
    } finally {
      setLoading(false);
    }
  }, [event.slug, authHeader]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh stats when guests change
  useEffect(() => {
    const channel = supabase
      .channel(`partner-panel-${event.slug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_guests', filter: `event_slug=eq.${event.slug}` },
        () => { load(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.slug, load]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { setAddError('Inserisci il nome del partner'); return; }
    setAddError('');
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/partners`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({ name }),
      });
      if (res.ok) {
        setNewName('');
        setShowAdd(false);
        await load();
      } else {
        const d = await res.json();
        setAddError(d.error ?? 'Errore durante la creazione');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo partner? L\'associazione con gli iscritti verrà mantenuta nel database.')) return;
    setDeleting(id);
    await fetch(`/api/events/${event.slug}/partners/${id}`, {
      method: 'DELETE', headers: authHeader(),
    });
    setDeleting(null);
    await load();
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium tracking-[0.08em] text-[var(--color-accent)] mb-0.5">TRACKING PARTNER</div>
          <p className="text-sm text-[var(--color-on-paper-muted)]/60 hidden sm:block" style={{ fontFamily: 'var(--font-geist)' }}>
            Link dedicati per ogni organizzazione — tieni traccia delle iscrizioni per calcolare le provvigioni.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            title="Aggiorna"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--color-rule-paper)] text-[var(--color-on-paper-muted)]/60 hover:text-[var(--color-accent)] hover:bg-[var(--color-paper-soft)] transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => { setShowAdd(v => !v); setAddError(''); setNewName(''); }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-[var(--color-accent)] text-white text-[13px] font-medium tracking-normal rounded-xl hover:bg-[var(--color-accent-lift)] transition-colors"
            style={{ fontFamily: 'var(--font-geist)', touchAction: 'manipulation' }}
          >
            <Plus size={13} />
            <span className="hidden sm:inline">AGGIUNGI PARTNER</span>
            <span className="sm:hidden">AGGIUNGI</span>
          </button>
        </div>
      </div>

      {/* Add partner form */}
      {showAdd && (
        <div className="bg-[var(--color-paper-soft)] border border-[var(--color-rule-paper)] rounded-xl p-4 sm:p-5 flex flex-col gap-3">
          <div className="text-[12px] tracking-[0.4em] text-[var(--color-accent)] mb-1">NUOVO PARTNER</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
              placeholder="Nome organizzazione (es. Associazione A)"
              autoFocus
              className="flex-1 border border-[var(--color-rule-paper)] bg-white text-sm text-[var(--color-ink)] px-4 py-2.5 rounded-xl placeholder-[#c0a0a0] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              style={{ fontFamily: 'var(--font-geist)', fontSize: '16px' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 sm:flex-none min-h-[48px] px-5 bg-[var(--color-accent)] text-white text-[13px] tracking-[0.2em] rounded-xl hover:bg-[var(--color-accent-lift)] disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'var(--font-geist)' }}
              >
                {adding ? 'CREAZIONE…' : 'CREA'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="w-11 h-11 flex items-center justify-center border border-[var(--color-rule-paper)] rounded-xl text-[var(--color-on-paper-muted)]/50 hover:text-[var(--color-accent)] transition-colors text-lg"
              >
                ×
              </button>
            </div>
          </div>
          {addError && (
            <p className="text-[13px] text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-geist)' }}>{addError}</p>
          )}
          <p className="text-[13px] text-[var(--color-on-paper-muted)]/45" style={{ fontFamily: 'var(--font-geist)' }}>
            Verrà generato un codice univoco e un link da inviare al partner.
          </p>
        </div>
      )}

      {/* Partner list + stats */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--color-on-paper-muted)]/40">Caricamento…</div>
      ) : partners.length === 0 ? (
        <div className="py-12 text-center">
          <Link2 size={28} className="text-[var(--color-on-paper-muted)]/20 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[var(--color-on-paper-muted)]/40" style={{ fontFamily: 'var(--font-geist)' }}>
            Nessun partner ancora.<br />
            Aggiungi un partner per generare il link di tracking.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Stats summary — 2×2 on mobile, 4 cols on desktop */}
          {(() => {
            const totalFromPartners = partners.reduce((s, p) => s + p.total_registered, 0);
            const diretti = eventTotal - totalFromPartners;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-[var(--color-rule-paper)] rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl font-light text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-syne)' }}>
                    {partners.length}
                  </div>
                  <div className="text-[8px] sm:text-[12px] font-medium tracking-[0.06em] sm:tracking-[0.35em] text-[var(--color-on-paper-muted)]/60 mt-1">PARTNER</div>
                </div>
                <div className="bg-white border border-[var(--color-rule-paper)] rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl font-light text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-syne)' }}>
                    {totalFromPartners}
                  </div>
                  <div className="text-[8px] sm:text-[12px] font-medium tracking-[0.06em] sm:tracking-[0.35em] text-[var(--color-on-paper-muted)]/60 mt-1">DA PARTNER</div>
                </div>
                <div className="bg-white border border-[var(--color-rule-paper)] rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl font-light text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-syne)' }}>
                    {eventTotal > 0 ? `${Math.round((totalFromPartners / eventTotal) * 100)}%` : '—'}
                  </div>
                  <div className="text-[8px] sm:text-[12px] font-medium tracking-[0.06em] sm:tracking-[0.35em] text-[var(--color-on-paper-muted)]/60 mt-1">% TOTALE</div>
                </div>
                <div className="bg-white border border-[var(--color-rule-paper)] rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl font-light text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-syne)' }}>
                    {diretti >= 0 ? diretti : '—'}
                  </div>
                  <div className="text-[8px] sm:text-[12px] font-medium tracking-[0.06em] sm:tracking-[0.35em] text-[var(--color-on-paper-muted)]/60 mt-1">DIRETTI</div>
                </div>
              </div>
            );
          })()}

          {/* Per-partner — card layout on mobile, table on desktop */}
          <div className="bg-white border border-[var(--color-rule-paper)] rounded-xl overflow-hidden">

            {/* ── Mobile card layout ── */}
            <div className="sm:hidden divide-y divide-[#f5eded]">
              {partners.map(p => {
                const pct  = eventTotal > 0 ? Math.round((p.total_registered / eventTotal) * 100) : 0;
                const link = partnerLink(event.slug, p.code);
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <div className="font-medium text-[14px] text-[var(--color-ink)] truncate" style={{ fontFamily: 'var(--font-syne)' }}>
                          {p.name}
                        </div>
                        <div className="text-[13px] text-[var(--color-on-paper-muted)]/40 font-mono mt-0.5">{p.code}</div>
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        title="Elimina partner"
                        className="ml-3 w-9 h-9 shrink-0 flex items-center justify-center text-[var(--color-on-paper-muted)]/30 hover:text-red-600 transition-colors disabled:opacity-30"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex gap-5 mb-3">
                      <div className="text-center">
                        <div className="text-xl font-light text-[var(--color-ink)] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>{p.total_registered}</div>
                        <div className="text-[8px] tracking-[0.25em] text-[var(--color-on-paper-muted)]/50 mt-1">ISCRITTI</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-light text-[var(--color-ink)] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>{p.total_checkedin}</div>
                        <div className="text-[8px] tracking-[0.25em] text-[var(--color-on-paper-muted)]/50 mt-1">PRESENTI</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium text-[var(--color-accent)] leading-none" style={{ fontFamily: 'var(--font-syne)' }}>{pct}%</div>
                        <div className="text-[8px] tracking-[0.25em] text-[var(--color-on-paper-muted)]/50 mt-1">% EVENTO</div>
                      </div>
                    </div>
                    <CopyButton text={link} />
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table layout ── */}
            <table className="hidden sm:table w-full [font-size:16px] border-collapse">
              <thead className="bg-[var(--color-paper-soft)] border-b border-[var(--color-rule-paper)]">
                <tr>
                  <th className="px-4 py-3 text-left text-[12px] tracking-[0.35em] text-[var(--color-on-paper-muted)]/60">PARTNER</th>
                  <th className="px-4 py-3 text-left text-[12px] tracking-[0.35em] text-[var(--color-on-paper-muted)]/60">LINK TRACKING</th>
                  <th className="px-4 py-3 text-center text-[12px] tracking-[0.35em] text-[var(--color-on-paper-muted)]/60">ISCRITTI</th>
                  <th className="px-4 py-3 text-center text-[12px] tracking-[0.35em] text-[var(--color-on-paper-muted)]/60">PRESENTI</th>
                  <th className="px-4 py-3 text-center text-[12px] tracking-[0.35em] text-[var(--color-on-paper-muted)]/60">% EVENTO</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5eded]">
                {partners.map(p => {
                  const pct = eventTotal > 0 ? Math.round((p.total_registered / eventTotal) * 100) : 0;
                  const link = partnerLink(event.slug, p.code);
                  return (
                    <tr key={p.id} className="group hover:bg-[#fdf9f9] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[13px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-syne)' }}>
                          {p.name}
                        </div>
                        <div className="text-[13px] text-[var(--color-on-paper-muted)]/50 mt-0.5 font-mono">{p.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--color-on-paper-muted)]/60 truncate max-w-[200px]" style={{ fontFamily: 'var(--font-geist)' }}>
                            {link}
                          </span>
                          <CopyButton text={link} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-light text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-syne)' }}>
                          {p.total_registered}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-light text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-syne)' }}>
                          {p.total_checkedin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[13px] font-medium text-[var(--color-accent)]">{pct}%</span>
                          {p.total_registered > 0 && (
                            <div className="w-14 h-1 bg-[var(--color-rule-paper)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-accent)] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          title="Elimina partner"
                          className="opacity-0 group-hover:opacity-100 text-[var(--color-on-paper-muted)]/40 hover:text-red-600 transition-all disabled:opacity-30"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[13px] text-[var(--color-on-paper-muted)]/40" style={{ fontFamily: 'var(--font-geist)' }}>
            I dati si aggiornano automaticamente in tempo reale. Eliminare un partner non rimuove l’associazione dagli iscritti già registrati.
          </p>
        </div>
      )}
    </div>
  );
}
