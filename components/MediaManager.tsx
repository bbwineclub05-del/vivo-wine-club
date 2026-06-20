'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Images, Upload, Trash2, ChevronDown, X, RefreshCw, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WINERIES } from '@/lib/wineries';

/* ── Types ── */
type DestType = 'wine-party' | 'wine-lounge' | 'winery-visit' | 'winery';

interface MediaImage {
  path: string;
  url:  string;
  name: string;
}

interface PreviewFile {
  file:    File;
  preview: string; // object URL
}

/* ── Helpers ── */
function folderFromDest(type: DestType, winerySlug: string): string {
  return type === 'winery' ? `wineries/${winerySlug}` : type;
}

const DEST_LABELS: Record<DestType, string> = {
  'wine-party':   'Wine Party',
  'wine-lounge':  'Wine Lounge',
  'winery-visit': 'Winery Visit',
  'winery':       'Cantina',
};

const inputClass =
  'w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm focus:outline-none focus:border-[#731515]/50 transition-colors duration-200';

/* ── Single image tile in gallery ── */
function GalleryTile({
  image,
  onDelete,
}: {
  image: MediaImage;
  onDelete: (path: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('Remove this image from the gallery?')) return;
    setDeleting(true);
    await onDelete(image.path);
    setDeleting(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative aspect-square group overflow-hidden bg-[#f5f0f0] border border-[#e8d5d5]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#731515] disabled:opacity-40 transition-all duration-200 rounded-lg"
        aria-label="Delete"
      >
        {deleting ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
      </button>
    </motion.div>
  );
}

/* ── Main component ── */
export default function MediaManager() {
  /* destination */
  const [destType,   setDestType]   = useState<DestType>('wine-party');
  const [winerySlug, setWinerySlug] = useState(WINERIES[0]?.slug ?? '');

  /* gallery */
  const [gallery,        setGallery]        = useState<MediaImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  /* upload */
  const [previews,  setPreviews]  = useState<PreviewFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const folder = folderFromDest(destType, winerySlug);

  /* ── Load gallery ── */
  const loadGallery = useCallback(async (f: string) => {
    setLoadingGallery(true);
    try {
      const res  = await fetch(`/api/media?folder=${encodeURIComponent(f)}`);
      const json = await res.json();
      setGallery(json.images ?? []);
    } catch {/* ignore */}
    finally { setLoadingGallery(false); }
  }, []);

  useEffect(() => {
    setGallery([]);
    loadGallery(folder);
  }, [folder, loadGallery]);

  /* ── Preview handling ── */
  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newPreviews: PreviewFile[] = Array.from(files).map((f) => ({
      file:    f,
      preview: URL.createObjectURL(f),
    }));
    setPreviews((p) => [...p, ...newPreviews]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removePreview(idx: number) {
    setPreviews((p) => {
      URL.revokeObjectURL(p[idx].preview);
      return p.filter((_, i) => i !== idx);
    });
  }

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => { previews.forEach((p) => URL.revokeObjectURL(p.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Upload ── */
  async function handleUpload() {
    if (previews.length === 0) return;
    setUploading(true);
    const uploaded: MediaImage[] = [];

    for (let i = 0; i < previews.length; i++) {
      setProgress(`Uploading ${i + 1}/${previews.length}…`);
      const fd = new FormData();
      fd.append('file',   previews[i].file);
      fd.append('folder', folder);
      try {
        const res  = await fetch('/api/media/upload', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${accessToken}` } });
        const json = await res.json();
        if (res.ok && json.url) {
          uploaded.push({ path: json.path, url: json.url, name: json.path.split('/').pop() ?? '' });
        } else {
          alert(`Upload failed for ${previews[i].file.name}: ${json.error ?? 'Unknown error'}`);
        }
      } catch {
        alert(`Upload failed for ${previews[i].file.name}`);
      }
    }

    // Clean up previews
    previews.forEach((p) => URL.revokeObjectURL(p.preview));
    setPreviews([]);
    setUploading(false);
    setProgress('');

    // Prepend uploaded to gallery
    if (uploaded.length > 0) {
      setGallery((g) => [...uploaded, ...g]);
    }
  }

  /* ── Delete from gallery ── */
  async function handleDelete(path: string) {
    try {
      const res = await fetch(`/api/media?path=${encodeURIComponent(path)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Delete failed');
      setGallery((g) => g.filter((img) => img.path !== path));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#fde8e8] flex items-center justify-center shrink-0">
          <Images size={15} className="text-[#731515]" />
        </div>
        <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">GESTIONE MEDIA</h2>
      </div>

      {/* ── Destination selector ── */}
      <div className="bg-white border border-[#e8d5d5] p-6 flex flex-col gap-5">
        <div className="text-[9px] tracking-[0.35em] text-[#731515]">DESTINAZIONE</div>

        {/* Type tabs */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(DEST_LABELS) as [DestType, string][]).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setDestType(type)}
              className={`text-[9px] tracking-[0.28em] px-4 py-2.5 border transition-colors duration-200 ${
                destType === type
                  ? 'bg-[#731515] text-white border-[#731515]'
                  : 'border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515]'
              }`}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Winery dropdown (only if type === 'winery') */}
        {destType === 'winery' && (
          <div className="relative max-w-xs">
            <label className="text-[9px] tracking-[0.3em] text-[#731515] mb-1.5 block">CANTINA</label>
            <div className="relative">
              <select
                value={winerySlug}
                onChange={(e) => setWinerySlug(e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer pr-10`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {WINERIES.map((w) => (
                  <option key={w.slug} value={w.slug}>{w.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#731515]" />
            </div>
          </div>
        )}

        <p className="text-[9px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          Cartella: <code className="font-mono text-[#731515]">media/{folder}</code>
        </p>
      </div>

      {/* ── Upload zone ── */}
      <div className="bg-white border border-[#e8d5d5] p-6 flex flex-col gap-5">
        <div className="text-[9px] tracking-[0.35em] text-[#731515]">CARICA IMMAGINI</div>

        {/* Drop / click area */}
        <div
          className="border-2 border-dashed border-[#e8d5d5] hover:border-[#731515]/30 transition-colors duration-200 p-8 flex flex-col items-center gap-3 cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFilesSelected(e.dataTransfer.files); }}
        >
          <Upload size={22} className="text-[#731515]/30" />
          <p className="text-xs text-[#7a4a4a]/50 text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
            Trascina le immagini qui, oppure clicca per selezionare
          </p>
          <span className="text-[9px] tracking-[0.28em] px-4 py-2 bg-white border border-[#731515]/30 text-[#731515] hover:bg-[#fdf0f0] transition-colors duration-200">
            SELEZIONA FILE
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {/* Preview grid */}
        {previews.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="text-[9px] tracking-[0.3em] text-[#7a4a4a]">
              ANTEPRIMA — {previews.length} {previews.length === 1 ? 'file' : 'file selezionati'}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <AnimatePresence mode="popLayout">
                {previews.map((p, i) => (
                  <motion.div
                    key={p.preview}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="relative aspect-square overflow-hidden bg-[#f5f0f0] group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt={p.file.name} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removePreview(i); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#731515] transition-all duration-150"
                    >
                      <X size={9} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 px-1 py-0.5">
                      <p className="text-white text-[8px] truncate">{p.file.name}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] text-white bg-[#731515] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 transition-colors duration-200"
              >
                {uploading ? (
                  <><RefreshCw size={11} className="animate-spin" />{progress}</>
                ) : (
                  <><Plus size={11} />CARICA {previews.length} {previews.length === 1 ? 'IMMAGINE' : 'IMMAGINI'}</>
                )}
              </button>
              {!uploading && (
                <button
                  onClick={() => {
                    previews.forEach((p) => URL.revokeObjectURL(p.preview));
                    setPreviews([]);
                  }}
                  className="text-[9px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] px-4 py-3 bg-white border border-[#e8d5d5] transition-colors duration-200"
                >
                  ANNULLA
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Gallery ── */}
      <div className="bg-white border border-[#e8d5d5] p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-[9px] tracking-[0.35em] text-[#731515]">
            GALLERIA — {DEST_LABELS[destType].toUpperCase()}
            {destType === 'winery' && (
              <span className="ml-2 text-[#7a4a4a]/50">
                · {WINERIES.find((w) => w.slug === winerySlug)?.name}
              </span>
            )}
          </div>
          <button
            onClick={() => loadGallery(folder)}
            disabled={loadingGallery}
            className="w-7 h-7 flex items-center justify-center bg-white border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515] disabled:opacity-40 transition-all duration-200"
          >
            <RefreshCw size={11} className={loadingGallery ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingGallery ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-[#f5f0f0] border border-[#e8d5d5] animate-pulse" />
            ))}
          </div>
        ) : gallery.length === 0 ? (
          <p className="text-xs italic text-[#7a4a4a]/40 py-6 text-center" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessuna immagine caricata per questa sezione.
          </p>
        ) : (
          <>
            <p className="text-[9px] text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
              {gallery.length} {gallery.length === 1 ? 'immagine' : 'immagini'} · Passa il mouse per eliminare
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <AnimatePresence mode="popLayout">
                {gallery.map((img) => (
                  <GalleryTile key={img.path} image={img} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
