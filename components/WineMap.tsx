'use client';

import { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface WineMapMarker {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** null = pending, true = precise, false = approximate (region-level) — admin view only */
  precise?: boolean | null;
}

interface WineMapProps {
  markers: WineMapMarker[];
  selectedSlug?: string | null;
  onMarkerClick?: (slug: string) => void;
  /** Editable (admin) mode: clicking the map reports the coordinate instead of selecting a marker. */
  onMapPick?: (lat: number, lng: number) => void;
  /** Imperative fly-to command — bump `key` (e.g. a counter) to re-trigger the same coordinates. */
  flyTo?: { lat: number; lng: number; zoom?: number; key?: number } | null;
  /** Shows the approximate/precise distinction with a dashed ring — admin only. */
  showPrecisionHint?: boolean;
  heightClassName?: string;
}

/** Deterministic small offset so markers sharing identical fallback coordinates don't stack invisibly. */
function jitterFor(slug: string, groupIndex: number, groupSize: number): [number, number] {
  if (groupSize <= 1) return [0, 0];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  const angle = ((hash % 360) + groupIndex * (360 / groupSize)) * (Math.PI / 180);
  const radiusDeg = 0.006; // ~650m
  return [Math.cos(angle) * radiusDeg, Math.sin(angle) * radiusDeg];
}

function withJitter(markers: WineMapMarker[]): (WineMapMarker & { jLat: number; jLng: number })[] {
  const groups = new Map<string, WineMapMarker[]>();
  for (const m of markers) {
    const key = `${m.lat.toFixed(4)},${m.lng.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const out: (WineMapMarker & { jLat: number; jLng: number })[] = [];
  for (const group of groups.values()) {
    group.forEach((m, i) => {
      const [dLat, dLng] = jitterFor(m.slug, i, group.length);
      out.push({ ...m, jLat: m.lat + dLat, jLng: m.lng + dLng });
    });
  }
  return out;
}

function makeIcon(Lref: typeof L, variant: 'default' | 'selected' | 'approx') {
  const bg = variant === 'selected'
    ? 'linear-gradient(135deg, #a3212f, #8a1220)'
    : variant === 'approx'
      ? 'linear-gradient(135deg, #b47c84, #836868)'
      : 'linear-gradient(135deg, #9b2323, #6c191e)';
  return Lref.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(26,5,5,0.4);border:2px solid #faf5f4;background:${bg};">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#faf5f4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg);"><path d="M8 3h8l-1 7a3 3 0 0 1-6 0z"/><path d="M12 13v6"/><path d="M8.5 21h7"/></svg>
    </div>`,
    iconSize: [26, 26], iconAnchor: [13, 24], popupAnchor: [0, -22],
  });
}

export default function WineMap({ markers, selectedSlug, onMarkerClick, onMapPick, flyTo, showPrecisionHint, heightClassName = 'h-full' }: WineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapPickRef     = useRef(onMapPick);
  onMarkerClickRef.current = onMarkerClick;
  onMapPickRef.current     = onMapPick;
  // Map init (Leaflet dynamic import + L.map()) is async — mutating the refs
  // above once it resolves does NOT re-run other effects or re-render this
  // component, so the marker-sync effect below needs actual React state to
  // know when the map is ready, or it can miss the point where mapRef gets
  // set and never draw anything.
  const [mapReady, setMapReady] = useState(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import('leaflet').then((Lmod) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const Lref = Lmod.default;

      const map = Lref.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([44.5, 8.5], 5);
      Lref.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap',
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map);

      markerLayerRef.current = Lref.layerGroup().addTo(map);
      mapRef.current = map;

      // Editable (admin) mode: report clicks up so the parent can update the
      // winery's lat/lng in state — the new pin then renders through the
      // normal marker-sync effect below, no separate "pick marker" needed.
      map.on('click', (e: L.LeafletMouseEvent) => onMapPickRef.current?.(e.latlng.lat, e.latlng.lng));

      setTimeout(() => map.invalidateSize(), 80);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Resize on container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync markers — re-runs once the map becomes ready (mapReady flips true)
  // as well as whenever the marker data itself changes.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !markerLayerRef.current) return;
    let cancelled = false;
    import('leaflet').then((Lmod) => {
      if (cancelled || !markerLayerRef.current) return;
      const Lref = Lmod.default;
      markerLayerRef.current.clearLayers();
      const jittered = withJitter(markers);
      for (const m of jittered) {
        const variant = m.slug === selectedSlug ? 'selected' : (showPrecisionHint && m.precise === false) ? 'approx' : 'default';
        const marker = Lref.marker([m.jLat, m.jLng], { icon: makeIcon(Lref, variant) });
        marker.bindTooltip(m.name, { direction: 'top', offset: [0, -22] });
        marker.on('click', () => onMarkerClickRef.current?.(m.slug));
        marker.addTo(markerLayerRef.current!);
      }
    });
    return () => { cancelled = true; };
  }, [mapReady, markers, selectedSlug, showPrecisionHint]);

  // Imperative flyTo
  useEffect(() => {
    if (!mapReady || !flyTo || !mapRef.current) return;
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 12, { duration: 1.0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, flyTo?.lat, flyTo?.lng, flyTo?.zoom, flyTo?.key]);

  return <div ref={containerRef} className={`w-full ${heightClassName}`} />;
}
