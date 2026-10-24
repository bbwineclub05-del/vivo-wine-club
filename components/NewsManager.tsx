'use client';

import { useCallback, useEffect, useState } from 'react';
import { GripVertical, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ActionButton, EmptyState, Field, NewButton, PageHead, Sheet, StatusPill, TextArea, TextInput,
} from '@/components/admin/ui';
import { resizeImage } from '@/lib/image-resize';

/**
 * Le news della homepage.
 *
 * Il modulo di prima aveva diciotto campi, di cui sette finivano sul
 * sito: gli altri erano colonne rimaste da versioni precedenti —
 * autore, categoria, stile e posizione dell'immagine, etichetta del
 * link — che si potevano compilare senza che cambiasse niente. Qui
 * ci sono i sette che si vedono, e basta.
 */

interface News {
  id: string;
  tag: string | null;
  title: string;
  description: string;
  href: string;
  region: string | null;
  images: string[];
  published: boolean;
  sort_order: number | null;
}

const VUOTA: Omit<News, 'id'> = {
  tag: 'NEWS',
  title: '',
  description: '',
  href: '',
  region: '',
  images: [],
  published: true,
  sort_order: 0,
};

export default function NewsManager() {
  const [list, setList] = useState<News[]>([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<News | Omit<News, 'id'> | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token ?? '');
      const res = await fetch('/api/news/all');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere le news.');
      setList(json.items ?? json.news ?? []);
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
        title="News"
        subtitle="Le card della homepage e della pagina News."
        action={<NewButton label="Nuova" onClick={() => setOpen({ ...VUOTA })} />}
      />

      {error ? (
        <EmptyState title="Non riesco a leggere le news" body={error} action={<ActionButton onClick={load}>Riprova</ActionButton>} />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nessuna news"
          body="La prima che scrivi compare in homepage."
          action={<ActionButton onClick={() => setOpen({ ...VUOTA })}>Scrivine una</ActionButton>}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {list.map((n) => (
            <button
              key={n.id}
              onClick={() => setOpen(n)}
              className="flex items-center gap-3 rounded-2xl border border-rule-paper px-3 py-2.5 text-left transition-colors hover:border-accent/40"
            >
              <GripVertical size={16} className="shrink-0 text-on-paper-muted/50" />
              {n.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.images[0]} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-paper-soft text-on-paper-muted">
                  <ImagePlus size={16} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">{n.title}</span>
                <span className="mt-0.5 block truncate text-fine text-on-paper-muted">
                  {n.tag ?? 'NEWS'}{n.region ? ` · ${n.region}` : ''}
                </span>
              </span>
              {!n.published && <StatusPill tone="off">bozza</StatusPill>}
            </button>
          ))}
        </div>
      )}

      {open && (
        <NewsSheet
          item={open}
          token={token}
          onClose={() => setOpen(null)}
          onDone={() => { setOpen(null); load(); }}
        />
      )}
    </>
  );
}

/* ── Il modulo ──────────────────────────────────────────────────── */

function NewsSheet({
  item, token, onClose, onDone,
}: {
  item: News | Omit<News, 'id'>;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const esistente = 'id' in item ? (item as News) : null;
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function aggiungiFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    const urls: string[] = [];
    for (const f of files) {
      try {
        const fd = new FormData();
        fd.append('file', await resizeImage(f, { maxSide: 1600 }));
        const res = await fetch('/api/news/upload', {
          method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Caricamento rifiutato.');
        urls.push(json.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento.');
      }
    }
    if (urls.length) set('images', [...(draft.images ?? []), ...urls]);
    setUploading(false);
  }

  async function salva() {
    setSaving(true);
    setError('');
    try {
      const body = {
        tag: draft.tag || 'NEWS',
        title: draft.title.trim(),
        description: draft.description.trim(),
        href: draft.href.trim(),
        region: draft.region || null,
        images: draft.images ?? [],
        published: draft.published,
        sort_order: draft.sort_order ?? 0,
      };
      if (!body.title || !body.description || !body.href) {
        throw new Error('Servono titolo, descrizione e link.');
      }
      const res = await fetch(esistente ? `/api/news/${esistente.id}` : '/api/news', {
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
      const res = await fetch(`/api/news/${esistente.id}`, {
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
      title={esistente ? 'Modifica news' : 'Nuova news'}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2.5">
          <ActionButton onClick={salva} disabled={saving} className="flex-1">
            {saving ? 'Salvo…' : 'Salva'}
          </ActionButton>
          {esistente && (
            <ActionButton variant="danger" onClick={() => (confirming ? elimina() : setConfirming(true))} disabled={saving}>
              <Trash2 size={15} />
              {confirming ? 'Confermi?' : 'Elimina'}
            </ActionButton>
          )}
        </div>
      }
    >
      {error && <p className="mb-4 text-fine font-medium text-accent">{error}</p>}

      <div className="flex flex-col gap-4">
        <Field label="Titolo"><TextInput value={draft.title} onChange={(e) => set('title', e.target.value)} autoFocus={!esistente} /></Field>
        <Field label="Descrizione" hint="due righe al massimo, sulla card">
          <TextArea rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Link" hint="dove porta la card">
          <TextInput value={draft.href} onChange={(e) => set('href', e.target.value)} placeholder="https://www.linkedin.com/..." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Etichetta"><TextInput value={draft.tag ?? ''} onChange={(e) => set('tag', e.target.value)} placeholder="NEWS" /></Field>
          <Field label="Luogo" hint="facoltativo"><TextInput value={draft.region ?? ''} onChange={(e) => set('region', e.target.value)} /></Field>
        </div>

        <div>
          <p className="mb-2 text-fine font-medium">Immagini</p>
          <label className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border border-rule-paper px-5 text-fine font-medium transition-colors hover:border-accent/40">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            {uploading ? 'Carico…' : 'Aggiungi'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={aggiungiFoto} />
          </label>

          {(draft.images ?? []).length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(draft.images ?? []).map((url) => (
                <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => set('images', (draft.images ?? []).filter((u) => u !== url))}
                    aria-label="Togli immagine"
                    className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-ink/70 text-on-ink hover:bg-ink"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-rule-paper p-4">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set('published', e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent)]"
          />
          <span className="text-body">Pubblicata sul sito</span>
        </label>
      </div>
    </Sheet>
  );
}
