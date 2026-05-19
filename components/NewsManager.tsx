'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, Plus, X, ChevronDown, Trash2, Eye, EyeOff, GripVertical, RefreshCw, ImagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { NewsItem } from './LinkedInSection';

/* ── Empty form ── */
const EMPTY_FORM = {
  tag:         'WINERY VISIT',
  title:       '',
  description: '',
  href:        '',
  region:      '',
  images:      '',   // newline-separated paths / URLs
  image_fit:   'cover' as 'cover' | 'contain',
  published:   true,
  sort_order:  0,
};

type FormState = typeof EMPTY_FORM;

/* ── Input / textarea helpers ── */
const inputClass =
  'w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm placeholder-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] tracking-[0.3em] text-[#731515]">{label}</label>
      {children}
      {hint && <p className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>{hint}</p>}
    </div>
  );
}

/* ── Image uploader sub-component ── */
function ImageUploader({ onUploaded, accessToken }: { onUploaded: (urls: string[]) => void; accessToken: string | null }) {
  const fileRef    = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Uploading ${i + 1}/${files.length}…`);
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res  = await fetch('/api/news/upload', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${accessToken}` } });
        const json = await res.json();
        if (res.ok && json.url) urls.push(json.url);
        else alert(`Upload failed for ${file.name}: ${json.error ?? 'Unknown error'}`);
      } catch {
        alert(`Upload failed for ${file.name}`);
      }
    }
    setUploading(false);
    setProgress('');
    if (urls.length > 0) onUploaded(urls);
    // Reset file input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.28em] px-4 py-2.5 border border-[#731515]/40 text-[#731515] hover:bg-[#731515]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {uploading ? (
          <>
            <RefreshCw size={11} className="animate-spin" />
            {progress}
          </>
        ) : (
          <>
            <ImagePlus size={11} />
            UPLOAD IMAGE
          </>
        )}
      </button>
      <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
        or paste path below
      </span>
    </div>
  );
}

/* ── News form (shared for create & edit) ── */
function NewsForm({
  initial,
  onSave,
  onCancel,
  saving,
  accessToken,
}: {
  initial: FormState;
  onSave: (f: FormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  accessToken: string | null;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  function handleUploaded(urls: string[]) {
    setForm((p) => ({
      ...p,
      images: [p.images.trim(), ...urls].filter(Boolean).join('\n'),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4 border-t border-[#e8d5d5]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="TAG">
          <input
            type="text"
            required
            value={form.tag}
            onChange={set('tag')}
            placeholder="WINERY VISIT"
            className={inputClass}
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </Field>
        <Field label="REGION / LOCATION">
          <input
            type="text"
            value={form.region}
            onChange={set('region')}
            placeholder="Valpolicella, Italy"
            className={inputClass}
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </Field>
      </div>

      <Field label="TITLE *">
        <input
          type="text"
          required
          value={form.title}
          onChange={set('title')}
          placeholder="Ca' del Bosco Visit"
          className={inputClass}
          style={{ fontFamily: 'var(--font-nunito)' }}
        />
      </Field>

      <Field label="DESCRIPTION *">
        <textarea
          required
          rows={4}
          value={form.description}
          onChange={set('description')}
          placeholder="Describe the news or visit…"
          className={`${inputClass} resize-none`}
          style={{ fontFamily: 'var(--font-nunito)' }}
        />
      </Field>

      <Field label="EXTERNAL LINK *" hint="Full URL including https://">
        <input
          type="url"
          required
          value={form.href}
          onChange={set('href')}
          placeholder="https://www.linkedin.com/…"
          className={inputClass}
          style={{ fontFamily: 'var(--font-nunito)' }}
        />
      </Field>

      <Field
        label="IMAGES"
        hint="One path/URL per line. First image shown first; multiple = slider."
      >
        <div className="flex flex-col gap-2">
          <ImageUploader onUploaded={handleUploaded} accessToken={accessToken} />
          <textarea
            rows={3}
            value={form.images}
            onChange={set('images')}
            placeholder={`/events/Winery visits/wv3.jpg\nhttps://…supabase.co/storage/v1/…`}
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="IMAGE STYLE">
          <div className="relative">
            <select
              value={form.image_fit}
              onChange={(e) => setForm((p) => ({ ...p, image_fit: e.target.value as 'cover' | 'contain' }))}
              className={`${inputClass} appearance-none cursor-pointer`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <option value="cover">Cover (photos)</option>
              <option value="contain">Contain (logos)</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#731515]" />
          </div>
        </Field>

        <Field label="SORT ORDER" hint="Lower = shown first">
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
            className={inputClass}
            style={{ fontFamily: 'var(--font-nunito)' }}
          />
        </Field>

        <Field label="VISIBILITY">
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, published: !p.published }))}
            className={`flex items-center gap-2 px-4 py-3 border text-sm transition-colors duration-200 ${
              form.published
                ? 'border-green-500/40 bg-green-50 text-green-700'
                : 'border-[#e8d5d5] bg-[#fdf6f6] text-[#7a4a4a]/60'
            }`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {form.published ? <Eye size={13} /> : <EyeOff size={13} />}
            {form.published ? 'Published' : 'Hidden'}
          </button>
        </Field>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-[9px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] px-5 py-3 border border-[#e8d5d5] transition-colors duration-200"
        >
          CANCEL
        </button>
        <button
          type="submit"
          disabled={saving}
          className="text-[9px] tracking-[0.3em] text-white bg-[#731515] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 transition-colors duration-200"
        >
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </form>
  );
}

/* ── Helpers ── */
function imagesToField(images: string[]): string {
  return images.join('\n');
}
function fieldToImages(raw: string): string[] {
  return raw.split('\n').map((s) => s.trim()).filter(Boolean);
}
function itemToForm(item: NewsItem): FormState {
  return {
    tag:         item.tag,
    title:       item.title,
    description: item.description,
    href:        item.href,
    region:      item.region ?? '',
    images:      imagesToField(item.images),
    image_fit:   item.image_fit,
    published:   item.published,
    sort_order:  item.sort_order,
  };
}

/* ── News row (list item with expand to edit) ── */
function NewsRow({
  item,
  onUpdate,
  onDelete,
  accessToken,
}: {
  item: NewsItem;
  onUpdate: (id: string, patch: Partial<NewsItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  accessToken: string | null;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [toggling,  setToggling]  = useState(false);

  async function handleSave(form: FormState) {
    setSaving(true);
    await onUpdate(item.id, {
      tag:        form.tag,
      title:      form.title,
      description: form.description,
      href:       form.href,
      region:     form.region || null,
      images:     fieldToImages(form.images),
      image_fit:  form.image_fit,
      published:  form.published,
      sort_order: form.sort_order,
    });
    setSaving(false);
    setExpanded(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setDeleting(true);
    await onDelete(item.id);
    setDeleting(false);
  }

  async function togglePublished() {
    setToggling(true);
    await onUpdate(item.id, { published: !item.published });
    setToggling(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-[#e8d5d5] overflow-hidden"
    >
      {/* Row header */}
      <div className="flex items-center gap-3 p-4">
        <div className="text-[#7a4a4a]/20 shrink-0 cursor-grab">
          <GripVertical size={14} />
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 bg-[#f5f0f0] border border-[#e8d5d5] shrink-0 overflow-hidden relative">
          {item.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#731515]/10" />
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#1a0505] truncate leading-snug" style={{ fontFamily: 'var(--font-syne)' }}>
            {item.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] tracking-[0.2em] text-[#731515]">{item.tag}</span>
            {item.region && <span className="text-[9px] text-[#7a4a4a]/40">{item.region}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={togglePublished}
            disabled={toggling}
            className={`text-[8px] tracking-[0.2em] px-2 py-1 border transition-colors duration-200 disabled:opacity-50 ${
              item.published
                ? 'border-green-500/40 text-green-700 bg-green-50'
                : 'border-[#e8d5d5] text-[#7a4a4a]/40'
            }`}
            title={item.published ? 'Click to hide' : 'Click to publish'}
          >
            {toggling ? '…' : item.published ? 'LIVE' : 'HIDDEN'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 flex items-center justify-center text-[#7a4a4a]/30 hover:text-[#731515] disabled:opacity-30 transition-colors duration-200"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 flex items-center justify-center text-[#7a4a4a]/40 hover:text-[#731515] transition-colors duration-200"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Edit form */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden px-5 pb-5"
          >
            <NewsForm
              initial={itemToForm(item)}
              onSave={handleSave}
              onCancel={() => setExpanded(false)}
              saving={saving}
              accessToken={accessToken}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main component ── */
export default function NewsManager() {
  const [items,       setItems]       = useState<NewsItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/news/all');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setItems(json.news ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Realtime: re-fetch when another session changes news ──────────────────
  useEffect(() => {
    if (!accessToken) return;
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel('news_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accessToken, load]);

  async function handleCreate(form: FormState) {
    setCreating(true);
    try {
      const res = await fetch('/api/news', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({
          ...form,
          region: form.region || null,
          images: fieldToImages(form.images),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create');
      setItems((prev) => [json.item, ...prev]);
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating news item');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string, patch: Partial<NewsItem>) {
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      const res = await fetch(`/api/news/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update');
      // Apply confirmed server state
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...json.item } : i)));
    } catch (err) {
      // Roll back optimistic update
      load();
      alert(err instanceof Error ? err.message : 'Error updating news item');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting news item');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center shrink-0">
            <Newspaper size={15} className="text-[#731515]" />
          </div>
          <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">GESTIONE NEWS</h2>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
              {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all duration-200"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.3em] text-white bg-[#731515] hover:bg-[#aa4848] px-4 py-2.5 transition-colors duration-200"
          >
            <Plus size={12} />
            ADD NEWS
          </button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-[#731515]/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] tracking-[0.4em] text-[#731515]">NEW NEWS CARD</div>
              <button onClick={() => setShowForm(false)} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors">
                <X size={15} />
              </button>
            </div>
            <NewsForm
              initial={{ ...EMPTY_FORM }}
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              saving={creating}
              accessToken={accessToken}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <p className="text-xs text-[#731515] text-center" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
      )}

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
          Loading news…
        </div>
      ) : items.length === 0 && !error ? (
        <div className="py-10 text-center">
          <p className="text-xs text-[#7a4a4a]/40 italic mb-2" style={{ fontFamily: 'var(--font-nunito)' }}>
            No news cards yet. The homepage shows the 3 hardcoded fallback cards.
          </p>
          <p className="text-[10px] text-[#7a4a4a]/30" style={{ fontFamily: 'var(--font-nunito)' }}>
            Add a card above to start managing news from the database.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
            {items.filter((i) => i.published).length} published · {items.filter((i) => !i.published).length} hidden · Sort order controls display sequence
          </p>
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <NewsRow
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  accessToken={accessToken}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
