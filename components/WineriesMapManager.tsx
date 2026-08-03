'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, AlertTriangle, Plus, Trash2, Loader2, Wine, Search, Save, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WineMapMarker } from '@/components/WineMap';

const WineMap = dynamic(() => import('@/components/WineMap'), { ssr: false });

interface WineryRow {
  slug: string;
  name: string;
  logo_url: string | null;
  region: string;
  country: string;
  description: string;
  visit_date: string | null;
  event_slug: string | null;
  lat: number | null;
  lng: number | null;
  coords_precise: boolean | null;
  photos: string[];
}

interface WineryWine {
  id: string;
  name: string;
  vintage: number | null;
  grape: string;
  rating: number | null;
  note: string;
  bottle_photo_url: string | null;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function uploadPhoto(file: File, folder: string, token: string): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await fetch('/api/media/upload', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url ?? null;
}

/** One row in the wine-tasting editor for the selected winery. */
function WineRow({ wine, token, wineryS, onChange, onDelete }: {
  wine: WineryWine; token: string; wineryS: string;
  onChange: (patch: Partial<WineryWine>) => void; onDelete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadPhoto(file, `wineries/${wineryS}/wines`, token);
    setUploading(false);
    if (url) onChange({ bottle_photo_url: url });
  }

  return (
    <div className="flex gap-3 border border-[#eddada] rounded-xl p-3">
      <button
        onClick={() => fileRef.current?.click()}
        className="w-11 h-[70px] rounded-lg overflow-hidden shrink-0 bg-[#fdf6f6] flex items-center justify-center relative border border-[#e8d5d5] hover:border-[#731515]/40 transition-colors"
        title="Carica foto bottiglia"
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin text-[#731515]" />
        ) : wine.bottle_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wine.bottle_photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={14} className="text-[#e8d5d5]" />
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </button>

      <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={wine.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nome vino"
          className="bg-white border border-[#e8d5d5] rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#731515] sm:col-span-2"
        />
        <input
          type="number"
          value={wine.vintage ?? ''}
          onChange={(e) => onChange({ vintage: e.target.value ? Number(e.target.value) : null })}
          placeholder="Annata"
          className="bg-white border border-[#e8d5d5] rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#731515]"
        />
        <input
          value={wine.grape}
          onChange={(e) => onChange({ grape: e.target.value })}
          placeholder="Vitigno"
          className="bg-white border border-[#e8d5d5] rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#731515]"
        />
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="range" min={1} max={5} step={0.5}
            value={wine.rating ?? 4}
            onChange={(e) => onChange({ rating: Number(e.target.value) })}
            className="flex-1 accent-[#731515]"
          />
          <span className="text-[11px] text-[#731515] tabular-nums w-8">{(wine.rating ?? 4).toFixed(1)}</span>
        </div>
        <textarea
          value={wine.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Nota di degustazione"
          rows={2}
          className="bg-white border border-[#e8d5d5] rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#731515] resize-none sm:col-span-2"
        />
      </div>

      <button onClick={onDelete} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors shrink-0 self-start mt-1">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function WineriesMapManager() {
  const [token, setToken] = useState('');
  const [wineries, setWineries] = useState<WineryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<WineryRow | null>(null);
  const [wines, setWines] = useState<WineryWine[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token ?? ''));
  }, []);

  function loadWineries() {
    setLoading(true);
    fetch('/api/wineries')
      .then(r => r.json())
      .then(d => setWineries(d.wineries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(loadWineries, []);

  useEffect(() => {
    if (!selectedSlug) { setDraft(null); setWines([]); return; }
    const w = wineries.find(x => x.slug === selectedSlug);
    setDraft(w ? { ...w, photos: w.photos ?? [] } : null);
    fetch(`/api/wineries/${selectedSlug}/wines`).then(r => r.json()).then(d => setWines(d.wines ?? [])).catch(() => setWines([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? wineries.filter(w => w.name.toLowerCase().includes(q) || w.region.toLowerCase().includes(q)) : wineries;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [wineries, search]);

  const needsReviewCount = wineries.filter(w => w.lat == null || w.coords_precise === false).length;

  const markers: WineMapMarker[] = useMemo(() => {
    const base = wineries.filter(w => w.lat != null && w.lng != null && w.slug !== selectedSlug)
      .map(w => ({ slug: w.slug, name: w.name, lat: w.lat!, lng: w.lng!, precise: w.coords_precise }));
    if (draft?.lat != null && draft?.lng != null) {
      base.push({ slug: draft.slug, name: draft.name, lat: draft.lat, lng: draft.lng, precise: draft.coords_precise });
    }
    return base;
  }, [wineries, draft, selectedSlug]);

  function handleMapPick(lat: number, lng: number) {
    if (!draft) return;
    setDraft({ ...draft, lat, lng, coords_precise: true });
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setUploadingPhoto(true);
    const url = await uploadPhoto(file, `wineries/${draft.slug}`, token);
    setUploadingPhoto(false);
    if (url) setDraft({ ...draft, photos: [...draft.photos, url] });
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  function removePhoto(url: string) {
    if (!draft) return;
    setDraft({ ...draft, photos: draft.photos.filter(p => p !== url) });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      await fetch(`/api/wineries/${draft.slug}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({
          region: draft.region, country: draft.country, description: draft.description,
          lat: draft.lat, lng: draft.lng, coords_precise: draft.coords_precise,
          photos: draft.photos,
        }),
      });
      loadWineries();
    } finally {
      setSaving(false);
    }
  }

  async function addWine() {
    if (!draft) return;
    const res = await fetch(`/api/wineries/${draft.slug}/wines`, {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ name: 'Nuovo vino', grape: '', rating: 4, note: '' }),
    });
    if (res.ok) {
      const d = await res.json();
      setWines(prev => [...prev, d.wine]);
    }
  }

  function updateWineLocal(id: string, patch: Partial<WineryWine>) {
    setWines(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
  }

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function updateWine(id: string, patch: Partial<WineryWine>) {
    updateWineLocal(id, patch);
    if (!draft) return;
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      fetch(`/api/wineries/${draft.slug}/wines/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(patch) }).catch(() => {});
    }, 600);
  }

  async function deleteWine(id: string) {
    if (!draft) return;
    setWines(prev => prev.filter(w => w.id !== id));
    await fetch(`/api/wineries/${draft.slug}/wines/${id}`, { method: 'DELETE', headers: authHeaders(token) }).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-5">
      {needsReviewCount > 0 && (
        <div className="flex items-center gap-2.5 bg-[#fdf0e0] border border-[#e8c5a0] rounded-lg px-4 py-2.5 text-[12px] text-[#8a5a1a]" style={{ fontFamily: 'var(--font-nunito)' }}>
          <AlertTriangle size={14} />
          {needsReviewCount} canti{needsReviewCount === 1 ? 'na' : 'ne'} con posizione mancante o approssimativa — selezionale dalla lista e clicca sulla mappa per correggere il pin.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a4a4a]/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca cantina o regione..."
              className="w-full bg-white border border-[#e8d5d5] rounded-lg pl-9 pr-3 py-2.5 text-[12px] focus:outline-none focus:border-[#731515]"
            />
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-[#731515]" /></div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto pr-1">
              {filtered.map(w => {
                const needsFix = w.lat == null || w.coords_precise === false;
                return (
                  <button
                    key={w.slug}
                    onClick={() => setSelectedSlug(w.slug)}
                    className={`text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
                      w.slug === selectedSlug ? 'border-[#731515]/50 bg-[#fdf6f6]' : 'border-transparent hover:bg-[#fdf6f6]/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#1a0505] truncate">{w.name}</p>
                      <p className="text-[10px] text-[#7a4a4a]/60 truncate">
                        {w.region || w.country || '—'} {w.event_slug ? '· visita reale' : '· catalogo'}
                      </p>
                    </div>
                    {needsFix && <AlertTriangle size={12} className="text-[#c98a3a] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {!draft ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center border border-dashed border-[#e8d5d5] rounded-xl">
              <MapPin size={22} className="text-[#7a4a4a]/25 mb-3" strokeWidth={1.4} />
              <p className="text-[12px] text-[#7a4a4a]/50">Seleziona una cantina per modificarla.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[9px] tracking-[0.35em] text-[#731515] uppercase mb-1">{draft.event_slug ? 'Visita reale' : 'Catalogo'}</p>
                <h3 className="text-xl text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>{draft.name}</h3>
              </div>

              {/* Map — click to place/move the pin */}
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#7a4a4a] uppercase mb-1.5">
                  Posizione {draft.lat == null ? '— clicca sulla mappa per impostarla' : draft.coords_precise === false ? '— approssimativa, clicca per correggere' : ''}
                </p>
                <div className="h-[280px] rounded-xl overflow-hidden border border-[#eddada]">
                  <WineMap
                    markers={markers}
                    selectedSlug={draft.slug}
                    onMapPick={handleMapPick}
                    showPrecisionHint
                    flyTo={draft.lat != null ? { lat: draft.lat, lng: draft.lng!, zoom: 11, key: 0 } : undefined}
                  />
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] tracking-[0.2em] text-[#7a4a4a] uppercase block mb-1">Regione</label>
                  <input
                    value={draft.region}
                    onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                    className="w-full bg-white border border-[#e8d5d5] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[#731515]"
                  />
                </div>
                <div>
                  <label className="text-[9px] tracking-[0.2em] text-[#7a4a4a] uppercase block mb-1">Paese</label>
                  <input
                    value={draft.country}
                    onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                    className="w-full bg-white border border-[#e8d5d5] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[#731515]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] tracking-[0.2em] text-[#7a4a4a] uppercase block mb-1">Descrizione</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="w-full bg-white border border-[#e8d5d5] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[#731515] resize-none"
                />
              </div>

              {/* Photo gallery */}
              <div>
                <label className="text-[9px] tracking-[0.2em] text-[#7a4a4a] uppercase block mb-1.5">Foto cantina</label>
                <div className="flex flex-wrap gap-2">
                  {draft.photos.map((url) => (
                    <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#e8d5d5] group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(url)}
                        className="absolute inset-0 bg-[#1a0505]/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border border-dashed border-[#e8d5d5] hover:border-[#731515]/40 flex items-center justify-center text-[#7a4a4a]/50 transition-colors"
                  >
                    {uploadingPhoto ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  </button>
                  <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="self-start inline-flex items-center gap-2 px-5 py-2.5 bg-[#731515] text-white text-[11px] tracking-[0.25em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                SALVA
              </button>

              {/* Wines tasted */}
              <div className="pt-2 border-t border-[#eddada]">
                <div className="flex items-center justify-between mt-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Wine size={13} className="text-[#731515]" />
                    <p className="text-[9px] tracking-[0.35em] text-[#731515] uppercase">Vini degustati</p>
                  </div>
                  <button onClick={addWine} className="inline-flex items-center gap-1.5 text-[11px] text-[#731515] hover:text-[#9b2323] transition-colors">
                    <Plus size={13} /> AGGIUNGI VINO
                  </button>
                </div>
                <div className="space-y-2.5">
                  {wines.map(wine => (
                    <WineRow
                      key={wine.id}
                      wine={wine}
                      token={token}
                      wineryS={draft.slug}
                      onChange={(patch) => updateWine(wine.id, patch)}
                      onDelete={() => deleteWine(wine.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
