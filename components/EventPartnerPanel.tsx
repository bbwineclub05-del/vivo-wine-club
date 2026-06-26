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
      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[10px] tracking-[0.2em] border border-[#eddada] rounded-lg text-[#731515] hover:bg-[#fdf6f6] transition-colors"
      style={{ fontFamily: 'var(--font-nunito)' }}
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
    <div className="p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] tracking-[0.45em] text-[#731515] mb-0.5">TRACKING PARTNER</div>
          <p className="text-sm text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
            Link dedicati per ogni organizzazione — tieni traccia delle iscrizioni per calcolare le provvigioni.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            title="Aggiorna"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eddada] text-[#7a4a4a]/60 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => { setShowAdd(v => !v); setAddError(''); setNewName(''); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#731515] text-white text-[10px] tracking-[0.2em] rounded-lg hover:bg-[#9b2323] transition-colors"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            <Plus size={13} /> AGGIUNGI PARTNER
          </button>
        </div>
      </div>

      {/* Add partner form */}
      {showAdd && (
        <div className="bg-[#fdf6f6] border border-[#eddada] rounded-xl p-5 flex flex-col gap-3">
          <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-1">NUOVO PARTNER</div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
              placeholder="Nome organizzazione (es. Associazione A)"
              autoFocus
              className="flex-1 border border-[#eddada] bg-white text-sm text-[#1a0505] px-4 py-2.5 rounded-lg placeholder-[#c0a0a0] focus:outline-none focus:border-[#731515] transition-colors"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="px-5 py-2.5 bg-[#731515] text-white text-[11px] tracking-[0.2em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {adding ? 'CREAZIONE…' : 'CREA'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="w-10 flex items-center justify-center border border-[#eddada] rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] transition-colors"
            >
              ×
            </button>
          </div>
          {addError && (
            <p className="text-[11px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{addError}</p>
          )}
          <p className="text-[10px] text-[#7a4a4a]/45" style={{ fontFamily: 'var(--font-nunito)' }}>
            Verrà generato un codice univoco e un link da inviare al partner.
          </p>
        </div>
      )}

      {/* Partner list + stats */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#7a4a4a]/40">Caricamento…</div>
      ) : partners.length === 0 ? (
        <div className="py-12 text-center">
          <Link2 size={28} className="text-[#7a4a4a]/20 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessun partner ancora.<br />
            Aggiungi un partner per generare il link di tracking.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-[#eddada] rounded-xl p-4 text-center">
              <div className="text-2xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                {partners.length}
              </div>
              <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 mt-1">PARTNER</div>
            </div>
            <div className="bg-white border border-[#eddada] rounded-xl p-4 text-center">
              <div className="text-2xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                {partners.reduce((s, p) => s + p.total_registered, 0)}
              </div>
              <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 mt-1">ISCRITTI DA PARTNER</div>
            </div>
            <div className="bg-white border border-[#eddada] rounded-xl p-4 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                {eventTotal > 0
                  ? `${Math.round((partners.reduce((s, p) => s + p.total_registered, 0) / eventTotal) * 100)}%`
                  : '—'}
              </div>
              <div className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/60 mt-1">% SUL TOTALE EVENTO</div>
            </div>
          </div>

          {/* Per-partner table */}
          <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#fdf6f6] border-b border-[#eddada]">
                <tr>
                  <th className="px-4 py-3 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">PARTNER</th>
                  <th className="px-4 py-3 text-left text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">LINK TRACKING</th>
                  <th className="px-4 py-3 text-center text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">ISCRITTI</th>
                  <th className="px-4 py-3 text-center text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">PRESENTI</th>
                  <th className="px-4 py-3 text-center text-[9px] tracking-[0.35em] text-[#7a4a4a]/60">% EVENTO</th>
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
                        <div className="font-medium text-[13px] text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                          {p.name}
                        </div>
                        <div className="text-[10px] text-[#7a4a4a]/50 mt-0.5 font-mono">{p.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#7a4a4a]/60 truncate max-w-[200px]" style={{ fontFamily: 'var(--font-nunito)' }}>
                            {link}
                          </span>
                          <CopyButton text={link} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                          {p.total_registered}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
                          {p.total_checkedin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[13px] font-medium text-[#731515]">{pct}%</span>
                          {p.total_registered > 0 && (
                            <div className="w-14 h-1 bg-[#eddada] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#731515] rounded-full"
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
                          className="opacity-0 group-hover:opacity-100 text-[#7a4a4a]/40 hover:text-red-600 transition-all disabled:opacity-30"
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

          <p className="text-[10px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
            I dati si aggiornano automaticamente in tempo reale. Eliminare un partner non rimuove l'associazione dagli iscritti già registrati.
          </p>
        </div>
      )}
    </div>
  );
}
