'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState, TextInput } from '@/components/admin/ui';

/**
 * I link dei partner, e quanta gente portano.
 *
 * Ogni organizzazione ha un suo link: chi si iscrive passando di lì
 * resta attribuito a loro, ed è così che si contano le provvigioni.
 *
 * Prima la stessa lista era scritta due volte — schede per il
 * telefono, tabella per il desktop — con due serie di numeri da
 * tenere allineate a mano. Adesso è una sola lista che si allarga.
 */

interface Partner {
  id: string;
  name: string;
  code: string;
  created_at: string;
  total_registered: number;
  total_checkedin: number;
}

function linkPartner(eventSlug: string, code: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://vivowineclub.com';
  return `${base}/events/${eventSlug}?partner=${code}`;
}

function CopiaLink({ text }: { text: string }) {
  const [fatto, setFatto] = useState(false);
  return (
    <ActionButton
      variant="quiet"
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setFatto(true);
            setTimeout(() => setFatto(false), 2000);
          })
          .catch(() => {});
      }}
    >
      {fatto ? <Check size={15} strokeWidth={2.2} /> : <Copy size={15} strokeWidth={1.8} />}
      {fatto ? 'Copiato' : 'Copia link'}
    </ActionButton>
  );
}

export default function EventPartnerPanel({
  event,
  accessToken,
}: {
  event: { id: string; slug: string; title: string };
  accessToken: string;
}) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [totaleEvento, setTotaleEvento] = useState(0);
  const [caricando, setCaricando] = useState(true);
  const [nome, setNome] = useState('');
  const [creando, setCreando] = useState(false);
  const [modulo, setModulo] = useState(false);
  const [confermaId, setConfermaId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    setCaricando(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/partners`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setPartners(data.partners ?? []);
      setTotaleEvento(data.event_total_registered ?? 0);
    } finally {
      setCaricando(false);
    }
  }, [event.slug, accessToken]);

  useEffect(() => {
    carica();
  }, [carica]);

  /* I numeri si muovono mentre la gente si iscrive. */
  useEffect(() => {
    const channel = supabase
      .channel(`partner-panel-${event.slug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_guests', filter: `event_slug=eq.${event.slug}` },
        () => carica(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.slug, carica]);

  async function crea() {
    const n = nome.trim();
    if (!n) {
      setErrore('Serve il nome dell’organizzazione.');
      return;
    }
    setErrore('');
    setCreando(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: n }),
      });
      if (res.ok) {
        setNome('');
        setModulo(false);
        await carica();
      } else {
        const d = await res.json().catch(() => ({}));
        setErrore(d.error ?? 'Non sono riuscito a crearlo.');
      }
    } finally {
      setCreando(false);
    }
  }

  async function elimina(id: string) {
    if (confermaId !== id) {
      setConfermaId(id);
      return;
    }
    setEliminando(id);
    try {
      await fetch(`/api/events/${event.slug}/partners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await carica();
    } finally {
      setEliminando(null);
      setConfermaId(null);
    }
  }

  const daPartner = partners.reduce((s, p) => s + p.total_registered, 0);
  const diretti = totaleEvento - daPartner;

  return (
    <div className="ds flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[46ch] text-fine text-on-paper-muted">
          Un link per ogni organizzazione: chi si iscrive passando di lì resta attribuito a loro.
        </p>
        <div className="flex shrink-0 gap-2">
          <ActionButton variant="quiet" onClick={carica}>
            <RefreshCw size={15} strokeWidth={1.8} />
            <span className="sr-only sm:not-sr-only">Aggiorna</span>
          </ActionButton>
          <ActionButton
            onClick={() => {
              setModulo((v) => !v);
              setErrore('');
              setNome('');
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Partner
          </ActionButton>
        </div>
      </div>

      {modulo && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rule-paper bg-paper-soft p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <TextInput
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') crea();
                if (e.key === 'Escape') setModulo(false);
              }}
              placeholder="Nome dell’organizzazione"
              autoFocus
            />
            <div className="flex shrink-0 gap-2">
              <ActionButton onClick={crea} disabled={creando} className="flex-1 sm:flex-none">
                {creando && <Loader2 size={15} className="animate-spin" />}
                {creando ? 'Creo…' : 'Crea'}
              </ActionButton>
              <ActionButton variant="quiet" onClick={() => setModulo(false)}>
                <X size={16} strokeWidth={1.8} />
                <span className="sr-only">Chiudi</span>
              </ActionButton>
            </div>
          </div>
          {errore && <p className="text-fine text-accent">{errore}</p>}
          <p className="text-fine text-on-paper-muted">
            Il codice e il link si generano da soli, pronti da mandare al partner.
          </p>
        </div>
      )}

      {caricando ? (
        <div className="flex justify-center py-14">
          <Loader2 size={22} className="animate-spin text-accent/50" />
        </div>
      ) : partners.length === 0 ? (
        <EmptyState
          title="Nessun partner"
          body="Aggiungine uno per avere un link da tracciare."
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper sm:grid-cols-4">
            {[
              { k: 'Partner', v: String(partners.length) },
              { k: 'Da partner', v: String(daPartner) },
              { k: 'Sul totale', v: totaleEvento > 0 ? `${Math.round((daPartner / totaleEvento) * 100)}%` : '—' },
              { k: 'Diretti', v: diretti >= 0 ? String(diretti) : '—' },
            ].map((s) => (
              <div key={s.k} className="bg-paper px-4 py-4">
                <dd className="ds-numeric text-[26px] leading-none">{s.v}</dd>
                <dt className="mt-1.5 text-fine text-on-paper-muted">{s.k}</dt>
              </div>
            ))}
          </dl>

          <ul className="flex flex-col gap-2.5">
            {partners.map((p) => {
              const pct = totaleEvento > 0 ? Math.round((p.total_registered / totaleEvento) * 100) : 0;
              return (
                <li key={p.id} className="rounded-2xl border border-rule-paper p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium">{p.name}</p>
                      <p className="ds-numeric mt-0.5 text-fine text-on-paper-muted">{p.code}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => elimina(p.id)}
                      onBlur={() => setConfermaId(null)}
                      disabled={eliminando === p.id}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-3 text-fine text-on-paper-muted transition-colors hover:text-accent disabled:opacity-40"
                    >
                      {eliminando === p.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} strokeWidth={1.8} />
                      )}
                      {confermaId === p.id && <span className="text-accent">Tocca ancora</span>}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <p className="text-fine text-on-paper-muted">
                      <span className="ds-numeric text-[20px] text-on-paper">{p.total_registered}</span> iscritti
                    </p>
                    <p className="text-fine text-on-paper-muted">
                      <span className="ds-numeric text-[20px] text-on-paper">{p.total_checkedin}</span> presenti
                    </p>
                    <p className="text-fine text-on-paper-muted">
                      <span className="ds-numeric text-[20px] text-accent">{pct}%</span> dell’evento
                    </p>
                  </div>

                  {p.total_registered > 0 && (
                    <div
                      className="mt-2.5 h-1 overflow-hidden rounded-full bg-rule-paper"
                      role="img"
                      aria-label={`${pct}% degli iscritti all’evento`}
                    >
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  )}

                  <div className="mt-3.5 flex flex-wrap items-center gap-3">
                    <CopiaLink text={linkPartner(event.slug, p.code)} />
                    <span className="min-w-0 flex-1 truncate text-fine text-on-paper-muted">
                      {linkPartner(event.slug, p.code)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-fine text-on-paper-muted">
            I numeri si aggiornano da soli. Eliminando un partner, chi si era già iscritto col suo link resta attribuito a lui.
          </p>
        </>
      )}
    </div>
  );
}
