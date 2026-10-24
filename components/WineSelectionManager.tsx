'use client';

import { useCallback, useEffect, useState } from 'react';
import { GripVertical, Wine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ActionButton, EmptyState, Field, NewButton, PageHead, Select, Sheet, StatusPill, TextArea, TextInput,
} from '@/components/admin/ui';
import PhotoUploader from '@/components/admin/PhotoUploader';

/**
 * VIVO Selection, dal lato di chi la riempie.
 *
 * Le bottiglie che consigliamo ai soci. La nota in italiano è
 * l'unica obbligatoria: inglese e francese si aggiungono quando c'è
 * tempo e, dove mancano, il socio legge l'italiano. Meglio una nota
 * sola scritta bene che tre scritte di fretta.
 */

interface Vino {
  id: string;
  name: string;
  producer: string | null;
  winery_slug: string | null;
  vintage: string | null;
  region: string | null;
  grape: string | null;
  price_cents: number | null;
  where_to_buy: string | null;
  photo_url: string | null;
  note_it: string | null;
  note_en: string | null;
  note_fr: string | null;
  sort_order: number;
  published: boolean;
}

const VUOTO: Omit<Vino, 'id'> = {
  name: '', producer: '', winery_slug: '', vintage: '', region: '', grape: '',
  price_cents: null, where_to_buy: '', photo_url: '',
  note_it: '', note_en: '', note_fr: '', sort_order: 0, published: true,
};

function eur(cents: number | null) {
  if (cents == null) return '—';
  return `${Math.floor(cents / 100)}${cents % 100 ? ',' + String(cents % 100).padStart(2, '0') : ''} €`;
}

export default function WineSelectionManager() {
  const [list, setList] = useState<Vino[]>([]);
  const [cantine, setCantine] = useState<{ slug: string; name: string }[]>([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Vino | Omit<Vino, 'id'> | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const [v, c] = await Promise.all([
        fetch('/api/wine-selection', { headers: { Authorization: `Bearer ${tk}` } }),
        fetch('/api/wineries'),
      ]);
      const jv = await v.json();
      if (!v.ok) throw new Error(jv.error ?? 'Impossibile leggere la selezione.');
      setList(jv.wines ?? []);
      if (c.ok) setCantine(((await c.json()).wineries ?? []).map((w: { slug: string; name: string }) => ({ slug: w.slug, name: w.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        title="VIVO Selection"
        subtitle="Le bottiglie che consigliamo ai soci. Si vedono solo nell’area del socio, non sul sito pubblico."
        action={<NewButton label="Bottiglia" onClick={() => setOpen({ ...VUOTO })} />}
      />

      {error ? (
        <EmptyState title="Non riesco a leggere la selezione" body={error} action={<ActionButton onClick={load}>Riprova</ActionButton>} />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nessuna bottiglia"
          body="La prima che aggiungi compare nell’area del socio, sotto VIVO Selection."
          action={<ActionButton onClick={() => setOpen({ ...VUOTO })}>Aggiungine una</ActionButton>}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {list.map((v) => (
            <button
              key={v.id}
              onClick={() => setOpen(v)}
              className="flex items-center gap-3 rounded-2xl border border-rule-paper px-3 py-2.5 text-left transition-colors hover:border-accent/40"
            >
              <GripVertical size={16} className="shrink-0 text-on-paper-muted/50" />
              {v.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-paper-soft text-on-paper-muted">
                  <Wine size={17} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">{v.name}</span>
                <span className="mt-0.5 block truncate text-fine text-on-paper-muted">
                  {[v.producer, v.vintage, eur(v.price_cents)].filter(Boolean).join(' · ')}
                </span>
              </span>
              {!v.published && <StatusPill tone="off">nascosta</StatusPill>}
            </button>
          ))}
        </div>
      )}

      {open && (
        <VinoSheet
          vino={open}
          cantine={cantine}
          token={token}
          onClose={() => setOpen(null)}
          onDone={() => { setOpen(null); load(); }}
        />
      )}
    </>
  );
}

/* ── La scheda di una bottiglia ─────────────────────────────────── */

function VinoSheet({
  vino, cantine, token, onClose, onDone,
}: {
  vino: Vino | Omit<Vino, 'id'>;
  cantine: { slug: string; name: string }[];
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const esistente = 'id' in vino ? (vino as Vino) : null;
  const [draft, setDraft] = useState(vino);
  const [prezzo, setPrezzo] = useState(
    vino.price_cents != null ? String(vino.price_cents / 100).replace('.', ',') : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  function set<K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function salva() {
    setSaving(true);
    setError('');
    try {
      const cents = prezzo.trim()
        ? Math.round(Number(prezzo.replace(',', '.')) * 100)
        : null;
      if (cents != null && (Number.isNaN(cents) || cents < 0)) throw new Error('Prezzo non valido.');
      if (!draft.name.trim()) throw new Error('Serve il nome del vino.');

      const body = { ...draft, price_cents: cents, ...(esistente ? { id: esistente.id } : {}) };
      const res = await fetch('/api/wine-selection', {
        method: esistente ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio fallito.');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  async function elimina() {
    if (!esistente) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/wine-selection?id=${esistente.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Eliminazione fallita.');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      title={esistente ? draft.name || 'Bottiglia' : 'Nuova bottiglia'}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2.5">
          <ActionButton onClick={salva} disabled={saving} className="flex-1">
            {saving ? 'Salvo…' : 'Salva'}
          </ActionButton>
          {esistente && (
            <ActionButton variant="danger" onClick={() => (confirming ? elimina() : setConfirming(true))} disabled={saving}>
              {confirming ? 'Confermi?' : 'Elimina'}
            </ActionButton>
          )}
        </div>
      }
    >
      {error && <p className="mb-4 text-fine font-medium text-accent">{error}</p>}

      <div className="flex flex-col gap-4">
        <Field label="Vino"><TextInput value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus={!esistente} /></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Produttore"><TextInput value={draft.producer ?? ''} onChange={(e) => set('producer', e.target.value)} /></Field>
          <Field label="Annata"><TextInput value={draft.vintage ?? ''} onChange={(e) => set('vintage', e.target.value)} placeholder="2021" /></Field>
        </div>

        <Field label="Cantina" hint="se è una che abbiamo visitato, il socio ci arriva con un tocco">
          <Select value={draft.winery_slug ?? ''} onChange={(e) => set('winery_slug', e.target.value)}>
            <option value="">— nessuna —</option>
            {cantine.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Zona"><TextInput value={draft.region ?? ''} onChange={(e) => set('region', e.target.value)} /></Field>
          <Field label="Uve"><TextInput value={draft.grape ?? ''} onChange={(e) => set('grape', e.target.value)} /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prezzo indicativo" hint="in euro">
            <TextInput value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder="14,50" inputMode="decimal" />
          </Field>
          <Field label="Dove si trova" hint="un link">
            <TextInput value={draft.where_to_buy ?? ''} onChange={(e) => set('where_to_buy', e.target.value)} placeholder="https://" />
          </Field>
        </div>

        <Field label="Perché la consigliamo" hint="italiano, obbligatoria">
          <TextArea rows={4} value={draft.note_it ?? ''} onChange={(e) => set('note_it', e.target.value)} />
        </Field>
        <Field label="English" hint="se manca, i soci inglesi leggono l’italiano">
          <TextArea rows={3} value={draft.note_en ?? ''} onChange={(e) => set('note_en', e.target.value)} />
        </Field>
        <Field label="Français" hint="se manca, i soci francesi leggono l’italiano">
          <TextArea rows={3} value={draft.note_fr ?? ''} onChange={(e) => set('note_fr', e.target.value)} />
        </Field>

        <div>
          <p className="mb-2 text-fine font-medium">Foto della bottiglia</p>
          {draft.photo_url ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.photo_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <ActionButton variant="quiet" onClick={() => set('photo_url', '')}>Cambia</ActionButton>
            </div>
          ) : (
            <PhotoUploader
              folder="selection"
              token={token}
              onUploaded={(url) => set('photo_url', url)}
            />
          )}
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-rule-paper p-4">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set('published', e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent)]"
          />
          <span className="text-body">Visibile ai soci</span>
        </label>
      </div>
    </Sheet>
  );
}
