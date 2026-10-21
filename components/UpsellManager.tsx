'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState, Field, PageHead, Select } from '@/components/admin/ui';

/**
 * Le proposte al momento del pagamento.
 *
 * La domanda è una sola e la pagina la segue: *quando uno sta per
 * pagare questa cosa, cosa gli proponiamo?* Prima si sceglieva il
 * dove, poi si spuntavano i prodotti in un elenco separato, e il
 * salvataggio era un pulsante a parte da ricordarsi di premere.
 *
 * Qui si tocca un prodotto e si vede subito quanti ne sono scelti;
 * il salvataggio resta un gesto esplicito — riscrive la
 * configurazione di quel contesto — ma la barra lo tiene sempre
 * sott'occhio invece di nasconderlo in fondo.
 */

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  slug: string;
  visible: boolean;
  product_variants?: { id: string; images: string[] }[];
}

interface EventRow {
  slug: string;
  title: string;
  date: string;
}

interface Stat {
  config_id: string | null;
  impressions: number;
  added: number;
  removed: number;
  kept: number;
}

interface Config {
  id: string;
  product_id: string;
  context: 'event' | 'merch';
  target_slug: string | null;
}

type Context = 'event' | 'merch';

function eur(n: number) {
  return `${Math.floor(n)},${String(Math.round((n % 1) * 100)).padStart(2, '0')} €`;
}

function firstImage(p: Product) {
  return p.images?.[0] ?? p.product_variants?.[0]?.images?.[0] ?? null;
}

export default function UpsellManager() {
  const [token, setToken] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [context, setContext] = useState<Context>('event');
  const [target, setTarget] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const h = { Authorization: `Bearer ${tk}` };

      const [pRes, eRes, cRes, sRes] = await Promise.all([
        fetch('/api/merch/products', { headers: h }),
        fetch('/api/events/all'),
        fetch('/api/admin/upsell', { headers: h }),
        fetch('/api/admin/upsell/analytics', { headers: h }),
      ]);

      if (pRes.ok) {
        const j = await pRes.json();
        setProducts((j.products ?? []).filter((p: Product) => p.visible));
      }
      if (eRes.ok) {
        const j = await eRes.json();
        setEvents(j.events ?? []);
      }
      if (cRes.ok) {
        const j = await cRes.json();
        setConfigs(j.configs ?? j.upsells ?? []);
      }
      if (sRes.ok) {
        const j = await sRes.json();
        setStats(j.analytics ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Quali prodotti sono già configurati per il contesto scelto. */
  const current = useMemo(
    () =>
      configs.filter(
        (c) => c.context === context && (c.target_slug ?? '') === (target || ''),
      ),
    [configs, context, target],
  );

  // Cambiando contesto si riparte da quello che c'è salvato lì.
  useEffect(() => {
    setChosen(new Set(current.map((c) => c.product_id)));
    setMessage('');
  }, [current]);

  function toggle(id: string) {
    setChosen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const dirty = useMemo(() => {
    const saved = new Set(current.map((c) => c.product_id));
    if (saved.size !== chosen.size) return true;
    for (const id of chosen) if (!saved.has(id)) return true;
    return false;
  }, [current, chosen]);

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/upsell', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          context,
          target_slug: target || null,
          product_ids: [...chosen],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      setMessage('Salvato.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  /** I numeri complessivi, su tutta la tabella. */
  const totals = useMemo(() => {
    const impressions = stats.reduce((s, x) => s + x.impressions, 0);
    const kept = stats.reduce((s, x) => s + x.kept, 0);
    return { impressions, kept, rate: impressions ? (kept / impressions) * 100 : 0 };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="Proposte al pagamento"
        subtitle="Cosa proporre a chi sta per comprare un biglietto o del merch."
      />

      {error ? (
        <EmptyState
          title="Non riesco a leggere le proposte"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          {/* Come stanno andando, su tutti i dati e non su una fetta. */}
          <div className="mb-6 grid grid-cols-3 gap-2.5">
            {[
              { k: 'Viste', v: totals.impressions.toLocaleString('it-IT') },
              { k: 'Finite nel carrello', v: String(totals.kept) },
              { k: 'Quante volte su 100', v: totals.rate.toFixed(1).replace('.', ',') },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl border border-rule-paper p-4">
                <p className="text-fine text-on-paper-muted">{c.k}</p>
                <p className="ds-display mt-1.5 text-[22px] leading-none tracking-[-0.02em]">
                  {c.v}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-5 grid gap-5 sm:grid-cols-2">
            <Field label="Quando">
              <div className="flex rounded-2xl border border-rule-paper p-1">
                {(
                  [
                    { id: 'event', label: 'Compra un biglietto' },
                    { id: 'merch', label: 'Compra del merch' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setContext(o.id);
                      setTarget('');
                    }}
                    aria-pressed={context === o.id}
                    className={`min-h-[44px] flex-1 rounded-xl px-2 text-fine font-medium transition-colors ${
                      context === o.id ? 'bg-accent text-paper' : 'text-on-paper-muted'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            {context === 'event' && (
              <Field label="Per quale evento" hint="— o per tutti">
                <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Tutti gli eventi</option>
                  {events.map((ev) => (
                    <option key={ev.slug} value={ev.slug}>
                      {ev.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {context === 'merch' && (
              <Field label="Per quale prodotto" hint="— o per tutti">
                <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Tutto il merch</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.title}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <p className="mb-3 text-fine text-on-paper-muted">
            Tocca i prodotti da proporre. Quello che salvi sostituisce la configurazione di questo
            contesto.
          </p>

          {products.length === 0 ? (
            <EmptyState title="Nessun prodotto" body="Servono prodotti visibili nel merch." />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {products.map((p) => {
                const on = chosen.has(p.id);
                const img = firstImage(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className={`flex flex-col overflow-hidden rounded-2xl border text-left transition-colors ${
                      on ? 'border-accent' : 'border-rule-paper hover:border-accent/40'
                    }`}
                  >
                    <span className="relative block aspect-square w-full bg-paper-soft">
                      {img ? (
                        <Image
                          src={img}
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 45vw, 22vw"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-on-paper-muted">
                          <Package size={22} strokeWidth={1.6} />
                        </span>
                      )}
                      {on && (
                        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-accent text-paper">
                          <Check size={15} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 p-3">
                      <span className="truncate text-body">{p.title}</span>
                      <span className="text-fine text-on-paper-muted">{eur(p.price)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Il salvataggio resta sott'occhio invece di stare in fondo. */}
          <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-rule-paper bg-paper py-4">
            <p className="mr-auto text-fine text-on-paper-muted">
              {chosen.size === 0
                ? 'Nessun prodotto proposto qui'
                : `${chosen.size} ${chosen.size === 1 ? 'prodotto proposto' : 'prodotti proposti'}`}
              {dirty && ' · non salvato'}
            </p>
            {message && <p className="text-fine font-medium text-accent">{message}</p>}
            <ActionButton onClick={save} disabled={saving || !dirty}>
              {saving ? 'Salvo…' : 'Salva'}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}
