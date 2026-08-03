'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, ArrowLeft, Wine, Calendar, ChevronDown, ArrowUpRight } from 'lucide-react';
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

function starString(rating: number | null): string {
  if (rating == null) return '';
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
}

/** Compact card for a winery in the "Past Visits" list. */
function WineryCard({ w, active, onClick }: { w: WineryRow; active: boolean; onClick: () => void }) {
  const hasPhoto = w.photos?.length > 0;
  const thumb = hasPhoto ? w.photos[0] : w.logo_url;
  return (
    <button
      onClick={onClick}
      className={`flex gap-3 p-3 shrink-0 text-left w-full bg-white border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-[0_8px_20px_rgba(107,26,26,0.10)] ${
        active ? 'border-[#731515]/60 shadow-[0_8px_20px_rgba(107,26,26,0.10)]' : 'border-[#eddada]'
      }`}
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#fdf6f6] flex items-center justify-center relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={w.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl opacity-40">🍇</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] tracking-[0.25em] text-[#731515] uppercase truncate">{w.region || w.country}</p>
        <p className="text-sm font-medium text-[#1a0505] leading-snug mt-0.5 line-clamp-2" style={{ fontFamily: 'var(--font-syne)' }}>
          {w.name}
        </p>
        {w.visit_date && (
          <p className="text-[11px] text-[#7a4a4a]/70 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
            {new Date(w.visit_date + 'T12:00:00Z').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </p>
        )}
      </div>
    </button>
  );
}

/**
 * Read-only detail preview — rendered INLINE in place of the "Past Visits"
 * list (same column as the map, never as a floating overlay) so it can never
 * end up layered on top of the map. Compact by design: short description,
 * wines tasted shown small with a 1-5 star rating each. Ratings and wine
 * data itself are edited from Gestione → Mappa Cantine (staff/admin), not
 * from here.
 */
function WineryDetailPanel({ winery, onBack }: { winery: WineryRow; onBack: () => void }) {
  const [wines, setWines] = useState<WineryWine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/wineries/${winery.slug}/wines`)
      .then(r => r.json())
      .then(d => setWines(d.wines ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [winery.slug]);

  const photo = winery.photos?.length > 0 ? winery.photos[0] : winery.logo_url;

  return (
    <div className="bg-white border border-[#eddada] rounded-xl overflow-hidden shrink-0">
      <div className="relative h-32 shrink-0 bg-gradient-to-br from-[#f3e3e5] to-[#e3c8cd]">
        {/* Whole photo/header area links to the full winery page — the back
            button sits on top and stops propagation so it stays independent. */}
        <Link href={`/wineries/${winery.slug}`} className="absolute inset-0" aria-label={`Scopri ${winery.name}`}>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={winery.name} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0505]/70 via-[#1a0505]/5 to-transparent" />
          <div className="absolute bottom-2.5 left-3.5 right-3.5">
            <p className="text-[8px] tracking-[0.25em] text-white/70 uppercase">{winery.region || winery.country}</p>
            <h3 className="text-base text-white font-light leading-tight mt-0.5" style={{ fontFamily: 'var(--font-syne)' }}>
              {winery.name}
            </h3>
          </div>
        </Link>
        <button
          onClick={onBack}
          aria-label="Torna alla lista"
          className="absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full bg-[#1a0505]/40 hover:bg-[#1a0505]/60 flex items-center justify-center text-white transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
      </div>

      <div className="p-3.5 flex flex-col gap-3">
        {winery.visit_date && (
          <p className="flex items-center gap-1.5 text-[10px] text-[#7a4a4a]/70" style={{ fontFamily: 'var(--font-nunito)' }}>
            <Calendar size={10} className="text-[#731515]" />
            {new Date(winery.visit_date + 'T12:00:00Z').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </p>
        )}

        {winery.description && (
          <p className="text-[12px] text-[#4a2a2a] leading-relaxed line-clamp-4" style={{ fontFamily: 'var(--font-nunito)' }}>
            {winery.description}
          </p>
        )}

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Wine size={11} className="text-[#731515]" />
            <p className="text-[8px] tracking-[0.32em] text-[#731515] uppercase">Vini degustati</p>
          </div>

          {loading ? (
            <div className="h-10 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#731515]/20 border-t-[#731515] animate-spin" />
            </div>
          ) : wines.length === 0 ? (
            <p className="text-[11px] text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
              Nessun vino registrato per questa visita.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {wines.map((wine) => (
                <div key={wine.id} className="flex items-center justify-between gap-2 border-b border-[#f0e4e5] pb-1.5 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#1a0505] truncate">
                      {wine.name}{wine.vintage ? <span className="text-[#7a4a4a]"> · {wine.vintage}</span> : null}
                    </p>
                    {wine.grape && <p className="text-[10px] text-[#7a4a4a]/60 truncate">{wine.grape}</p>}
                  </div>
                  {wine.rating != null && (
                    <span className="text-[#731515] text-[11px] whitespace-nowrap shrink-0">{starString(wine.rating)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          href={`/wineries/${winery.slug}`}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-[#731515] hover:text-[#9b2323] transition-colors self-start uppercase"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          Scopri la cantina
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export default function WineVisitsMapSection() {
  const [wineries, setWineries] = useState<WineryRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detailSlug, setDetailSlug]     = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);

  useEffect(() => {
    fetch('/api/wineries')
      .then(r => r.json())
      .then(d => setWineries((d.wineries ?? []).filter((w: WineryRow) => w.lat != null && w.lng != null)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const regions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of wineries) {
      const key = w.region?.trim() || w.country?.trim() || 'Altro';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [wineries]);

  const filtered = useMemo(() => {
    if (regionFilter === 'all') return wineries;
    return wineries.filter(w => (w.region?.trim() || w.country?.trim() || 'Altro') === regionFilter);
  }, [wineries, regionFilter]);

  const markers: WineMapMarker[] = useMemo(
    () => filtered.map(w => ({ slug: w.slug, name: w.name, lat: w.lat!, lng: w.lng! })),
    [filtered],
  );

  function handleRegionChange(region: string) {
    setRegionFilter(region);
    setDetailSlug(null); // the winery currently previewed may not belong to the new region
    const matches = (region === 'all' ? wineries : wineries.filter(w => (w.region?.trim() || w.country?.trim() || 'Altro') === region));
    if (matches.length === 0) return;
    const lats = matches.map(w => w.lat!);
    const lngs = matches.map(w => w.lng!);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    setFlyTo({ lat: centerLat, lng: centerLng, zoom: matches.length === 1 ? 12 : 7, key: Date.now() });
  }

  // Selecting a winery (map pin or list card) flies the map to it AND shows
  // its preview inline, in the same column as the list — never as an overlay
  // on top of the map.
  function handleSelect(slug: string) {
    setSelectedSlug(slug);
    setDetailSlug(slug);
    const w = wineries.find(x => x.slug === slug);
    if (w?.lat != null && w?.lng != null) setFlyTo({ lat: w.lat, lng: w.lng, zoom: 12, key: Date.now() });
  }

  const detailWinery = wineries.find(w => w.slug === detailSlug) ?? null;

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-white leading-none tracking-tight" style={{ fontFamily: 'var(--font-syne)' }}>
            Mappa Cantine
          </h1>
          <p className="mt-2 text-sm text-white/50 font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
            Le cantine esplorate da Vivo Wine Club, in Italia e nel mondo.
          </p>
        </div>

        {/* Region dropdown */}
        <div className="relative">
          <select
            value={regionFilter}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="appearance-none bg-white border border-[#e8d5d5] rounded-lg pl-4 pr-9 py-2.5 text-[12px] text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            <option value="all">Tutte le regioni ({wineries.length})</option>
            {regions.map(([region, count]) => (
              <option key={region} value={region}>{region} ({count})</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#731515] pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      ) : wineries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <MapPin size={28} className="text-white/25 mb-4" strokeWidth={1.4} />
          <p className="text-sm text-white/50" style={{ fontFamily: 'var(--font-nunito)' }}>Nessuna cantina sulla mappa ancora.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Map */}
          <div className="lg:col-span-3 h-[420px] md:h-[560px] rounded-xl overflow-hidden border border-[#eddada]">
            <WineMap markers={markers} selectedSlug={selectedSlug} onMarkerClick={handleSelect} flyTo={flyTo} />
          </div>

          {/* Past Visits list — swaps to an inline preview when a winery is selected */}
          <div className="lg:col-span-2 flex flex-col gap-2.5 max-h-[420px] md:max-h-[560px] overflow-y-auto pr-1">
            {detailWinery ? (
              <WineryDetailPanel winery={detailWinery} onBack={() => setDetailSlug(null)} />
            ) : (
              filtered
                .slice()
                .sort((a, b) => (b.visit_date ?? '').localeCompare(a.visit_date ?? ''))
                .map(w => (
                  <WineryCard
                    key={w.slug}
                    w={w}
                    active={w.slug === selectedSlug}
                    onClick={() => handleSelect(w.slug)}
                  />
                ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
