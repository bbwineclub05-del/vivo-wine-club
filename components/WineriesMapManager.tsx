'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Crosshair, MapPin, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ActionButton, EmptyState, Field, PageHead, Sheet, StatusPill, TextArea, TextInput,
} from '@/components/admin/ui';
import PhotoUploader from '@/components/admin/PhotoUploader';

const WineMap = dynamic(() => import('@/components/WineMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-paper-soft" />,
});

/**
 * Le cantine sul posto.
 *
 * Prima qui c'erano due colonne pensate per un monitor: l'elenco a
 * sinistra e la mappa a destra, che su un telefono finiva sotto
 * quaranta nomi — cioè non si vedeva mai. Adesso la mappa viene prima
 * di tutto, con tutti i pin, e si tocca un pin o un nome per aprire la
 * scheda. Spostare la posizione si fa toccando la mappa dentro la
 * scheda, che è l'unico gesto che serve.
 *
 * Quello che si scrive qui è anche quello che legge il sito: da oggi
 * la fonte è una sola.
 */

interface Winery {
  slug: string;
  name: string;
  region: string | null;
  country: string | null;
  classification: string | null;
  short_description: string | null;
  description: string | null;
  logo_url: string | null;
  visit_date: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  booking_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  coords_precise: boolean | null;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export default function WineriesMapManager() {
  const [token, setToken] = useState('');
  const [list, setList] = useState<Winery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token ?? '');
      const res = await fetch('/api/wineries');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere le cantine.');
      setList(json.wineries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((w) =>
      !q || `${w.name} ${w.region ?? ''} ${w.country ?? ''}`.toLowerCase().includes(q),
    );
  }, [list, query]);

  const markers = useMemo(
    () =>
      visible
        .filter((w) => w.lat != null && w.lng != null)
        .map((w) => ({
          slug: w.slug,
          name: w.name,
          lat: w.lat as number,
          lng: w.lng as number,
          precise: w.coords_precise,
        })),
    [visible],
  );

  const daSistemare = list.filter((w) => w.lat == null || !w.coords_precise).length;
  const open = list.find((w) => w.slug === openSlug) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PageHead
        title="Cantine"
        subtitle="Posizione, foto, vini e scheda. È quello che vede chi apre la cantina sul sito."
      />

      {error ? (
        <EmptyState
          title="Non riesco a leggere le cantine"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <>
          {/* ── La mappa, prima di tutto ── */}
          <div className="overflow-hidden rounded-2xl border border-rule-paper">
            <WineMap
              markers={markers}
              onMarkerClick={(slug) => setOpenSlug(slug)}
              showPrecisionHint
              heightClassName="h-[300px] lg:h-[460px]"
            />
          </div>

          <div className="mt-4 flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-full border border-rule-paper px-4">
              <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca cantina o regione"
                className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Pulisci" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft">
                  <X size={15} strokeWidth={2} />
                </button>
              )}
            </div>
            {daSistemare > 0 && (
              <StatusPill tone="warn">{daSistemare} da posizionare con precisione</StatusPill>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            {visible.map((w) => (
              <button
                key={w.slug}
                onClick={() => setOpenSlug(w.slug)}
                className="flex items-center gap-3 rounded-2xl border border-rule-paper px-3.5 py-3 text-left transition-colors hover:border-accent/40"
              >
                <MapPin
                  size={17}
                  strokeWidth={1.8}
                  className={`shrink-0 ${w.coords_precise ? 'text-accent' : 'text-on-paper-muted'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">{w.name}</span>
                  <span className="mt-0.5 block truncate text-fine text-on-paper-muted">
                    {[w.region, w.country].filter(Boolean).join(', ') || 'senza regione'}
                    {w.visit_date ? ` · visitata il ${fmtDate(w.visit_date)}` : ''}
                  </span>
                </span>
              </button>
            ))}
            {visible.length === 0 && <EmptyState title="Nessuna cantina" body="Prova con un altro nome." />}
          </div>
        </>
      )}

      {open && (
        <WinerySheet
          winery={open}
          token={token}
          onClose={() => setOpenSlug(null)}
          onSaved={(next) => setList((l) => l.map((w) => (w.slug === next.slug ? next : w)))}
        />
      )}
    </>
  );
}

/* ── La scheda di una cantina ───────────────────────────────────── */

function WinerySheet({
  winery, token, onClose, onSaved,
}: {
  winery: Winery;
  token: string;
  onClose: () => void;
  onSaved: (w: Winery) => void;
}) {
  const [draft, setDraft] = useState<Winery>(winery);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'scheda' | 'posizione' | 'foto'>('scheda');

  function set<K extends keyof Winery>(key: K, value: Winery[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/wineries/${draft.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: draft.name,
          region: draft.region,
          country: draft.country,
          classification: draft.classification,
          short_description: draft.short_description,
          description: draft.description,
          visit_date: draft.visit_date,
          website: draft.website,
          phone: draft.phone,
          email: draft.email,
          booking_url: draft.booking_url,
          address: draft.address,
          lat: draft.lat,
          lng: draft.lng,
          coords_precise: draft.coords_precise,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio fallito.');
      onSaved(data.winery ?? draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      title={winery.name}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2.5">
          <ActionButton onClick={save} disabled={saving} className="flex-1">
            {saving ? 'Salvo…' : 'Salva'}
          </ActionButton>
          <ActionButton variant="quiet" onClick={onClose}>Chiudi</ActionButton>
        </div>
      }
    >
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['scheda', 'posizione', 'foto'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-fine font-medium capitalize transition-colors ${
              tab === t ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-fine font-medium text-accent">{error}</p>}

      {tab === 'scheda' && (
        <div className="flex flex-col gap-4">
          <Field label="Nome"><TextInput value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Regione"><TextInput value={draft.region ?? ''} onChange={(e) => set('region', e.target.value)} /></Field>
            <Field label="Paese"><TextInput value={draft.country ?? ''} onChange={(e) => set('country', e.target.value)} /></Field>
          </div>
          <Field label="Classificazione" hint="facoltativa">
            <TextInput
              value={draft.classification ?? ''}
              onChange={(e) => set('classification', e.target.value)}
              placeholder="Premier Cru Classé 1855 · Pauillac"
            />
          </Field>
          <Field label="Data della visita" hint="solo se ci siamo stati">
            <TextInput type="date" value={draft.visit_date?.slice(0, 10) ?? ''} onChange={(e) => set('visit_date', e.target.value || null)} />
          </Field>
          <Field label="Riga breve" hint="l'anteprima nell'elenco del sito">
            <TextArea rows={2} value={draft.short_description ?? ''} onChange={(e) => set('short_description', e.target.value)} />
          </Field>
          <Field label="Descrizione" hint="una riga vuota separa i paragrafi">
            <TextArea rows={10} value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </Field>

          {/* I contatti li vedono i soci nella loro area: è con questi
              che chiedono una visita dicendo che arrivano da noi. */}
          <p className="mt-2 text-body font-medium">Contatti per i soci</p>
          <Field label="Indirizzo"><TextInput value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefono"><TextInput value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><TextInput value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
          </div>
          <Field label="Sito"><TextInput value={draft.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
          <Field label="Link per prenotare" hint="se la cantina ne ha uno">
            <TextInput value={draft.booking_url ?? ''} onChange={(e) => set('booking_url', e.target.value)} placeholder="https://" />
          </Field>
        </div>
      )}

      {tab === 'posizione' && (
        <div>
          <p className="mb-3 text-fine text-on-paper-muted">
            Tocca la mappa dove si trova davvero la cantina: il pin si sposta lì.
          </p>
          <div className="overflow-hidden rounded-2xl border border-rule-paper">
            <WineMap
              markers={draft.lat != null && draft.lng != null
                ? [{ slug: draft.slug, name: draft.name, lat: draft.lat, lng: draft.lng, precise: draft.coords_precise }]
                : []}
              selectedSlug={draft.slug}
              onMapPick={(lat, lng) => { set('lat', lat); set('lng', lng); set('coords_precise', true); }}
              flyTo={draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng, zoom: 13, key: 1 } : null}
              showPrecisionHint
              heightClassName="h-[320px]"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusPill tone={draft.coords_precise ? 'good' : 'warn'}>
              {draft.coords_precise ? 'posizione confermata' : 'posizione approssimativa'}
            </StatusPill>
            {draft.lat != null && (
              <span className="ds-numeric text-fine text-on-paper-muted">
                {draft.lat.toFixed(5)}, {draft.lng?.toFixed(5)}
              </span>
            )}
          </div>

          <ActionButton
            variant="quiet"
            className="mt-4"
            onClick={() => { set('coords_precise', false); }}
          >
            <Crosshair size={15} />
            Segna come approssimativa
          </ActionButton>
        </div>
      )}

      {tab === 'foto' && <PhotoUploader folder={`wineries/${draft.slug}`} token={token} />}
    </Sheet>
  );
}
