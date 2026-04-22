'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MapPin, Star, X } from 'lucide-react';
import type { Winery } from './WineriesGlobe';

const WineriesGlobe = dynamic(() => import('./WineriesGlobe'), { ssr: false });

// Defined at module level — never recreated on re-render
const TOP_WINERIES = [
  { rank: '01', name: 'Château Latour',   region: 'Pauillac',      country: 'Bordeaux' },
  { rank: '02', name: 'Mouton Rothschild',region: 'Pauillac',      country: 'Bordeaux' },
  { rank: '03', name: 'Château Montrose', region: 'Saint-Estèphe', country: 'Bordeaux' },
  { rank: '04', name: "Ca' del Bosco",    region: 'Franciacorta',  country: 'Italy'    },
  { rank: '05', name: 'Pellissero',       region: 'Barbaresco',    country: 'Italy'    },
] as const;

export const WINERIES: Winery[] = [
  {
    id: 1,
    name: 'Gaja',
    region: 'Barolo / Barbaresco',
    country: 'Italy',
    lat: 44.76,
    lng: 8.03,
    description:
      'Legendary winery of the Piedmontese Langhe, pioneer of modern Barbaresco. Angelo Gaja revolutionised Italian wine with Burgundian methods and an uncompromising vision.',
    visited: '2024',
    highlights: ['Barbaresco DOCG', 'Barolo Sperss', "Ca' Marcanda"],
  },
  {
    id: 2,
    name: 'Marchesi Antinori',
    region: 'Toscana',
    country: 'Italy',
    lat: 43.77,
    lng: 11.25,
    description:
      "A winemaking family with 26 generations of history, creator of Tignanello and pioneer of the Super Tuscans. The Bargino winery is an architectural masterpiece built into the hillside.",
    visited: '2024',
    highlights: ['Tignanello', 'Solaia', 'Guado al Tasso'],
  },
  {
    id: 3,
    name: 'Château Margaux',
    region: 'Bordeaux',
    country: 'France',
    lat: 45.04,
    lng: -0.67,
    description:
      "Bordeaux's Premier Grand Cru Classé, a symbol of French elegance for over two centuries. Its most celebrated vintages rank among the most coveted bottles by collectors worldwide.",
    visited: '2023',
    highlights: ['Château Margaux', 'Pavillon Rouge', 'Pavillon Blanc'],
  },
  {
    id: 4,
    name: 'Domaine de la Romanée-Conti',
    region: 'Burgundy',
    country: 'France',
    lat: 47.16,
    lng: 4.95,
    description:
      "The most exclusive and legendary winery in the world. It produces the most expensive and sought-after wines on the planet from a mere 1.8 hectares of Burgundian soil.",
    visited: '2023',
    highlights: ['Romanée-Conti', 'La Tâche', 'Richebourg'],
  },
  {
    id: 5,
    name: 'Vega Sicilia',
    region: 'Ribera del Duero',
    country: 'Spain',
    lat: 41.67,
    lng: -4.20,
    description:
      "Spain's most prestigious winery, with over 150 years of history. The Único is released only in exceptional vintages after years of ageing.",
    visited: '2024',
    highlights: ['Único', 'Valbuena', 'Alión'],
  },
  {
    id: 6,
    name: 'Quinta do Vesuvio',
    region: 'Douro Valley',
    country: 'Portugal',
    lat: 41.20,
    lng: -7.55,
    description:
      'One of the most prestigious Vintage Port producers in the wild heart of the Douro. Terraces carved from schist yield concentrated grapes of extraordinary intensity.',
    visited: '2023',
    highlights: ['Quinta do Vesuvio Vintage Port', 'Pombal do Vesuvio'],
  },
  {
    id: 7,
    name: 'Catena Zapata',
    region: 'Mendoza',
    country: 'Argentina',
    lat: -32.89,
    lng: -68.85,
    description:
      "Pioneers of high-altitude Malbec in Argentina and one of the most innovative wineries in the New World. The Adrianna vineyards, at 1,500 metres elevation, produce world-class wines.",
    visited: '2024',
    highlights: ['Adrianna Vineyard', 'Nicolás Catena Zapata', 'Adrianna White Bones'],
  },
  {
    id: 8,
    name: 'Opus One',
    region: 'Napa Valley',
    country: 'USA',
    lat: 38.40,
    lng: -122.42,
    description:
      "Born from the historic partnership between Robert Mondavi and Baron Philippe de Rothschild, Opus One is the quintessential Californian icon — a blend of Cabernet Sauvignon and Bordeaux varietals.",
    visited: '2023',
    highlights: ['Opus One', 'Overture'],
  },
  {
    id: 9,
    name: 'Penfolds',
    region: 'Barossa Valley',
    country: 'Australia',
    lat: -34.53,
    lng: 138.96,
    description:
      "Australia's most iconic winery, producer of the legendary Grange Hermitage. Since 1844, Penfolds has defined the style of great Australian Shiraz.",
    visited: '2024',
    highlights: ['Grange', 'RWT Shiraz', 'Bin 707'],
  },
  {
    id: 10,
    name: 'Klein Constantia',
    region: 'Constantia',
    country: 'South Africa',
    lat: -34.02,
    lng: 18.41,
    description:
      "A historic South African estate, renowned for Vin de Constance — the sweet wine favoured by Napoleon Bonaparte during his exile on Saint Helena.",
    visited: '2023',
    highlights: ['Vin de Constance', 'Metis', 'KC Sauvignon Blanc'],
  },
  {
    id: 11,
    name: 'Cloudy Bay',
    region: 'Marlborough',
    country: 'New Zealand',
    lat: -41.50,
    lng: 173.96,
    description:
      "An icon of New Zealand Sauvignon Blanc, the winery that defined the aromatic profile that conquered the world. Located in the Marlborough region at the northern tip of the South Island.",
    visited: '2024',
    highlights: ['Sauvignon Blanc', 'Te Koko', 'Pelorus'],
  },
  {
    id: 12,
    name: 'Concha y Toro',
    region: 'Maipo Valley',
    country: 'Chile',
    lat: -33.54,
    lng: -70.65,
    description:
      "Chile's largest winery and producer of the legendary Don Melchor, considered one of the finest Cabernet Sauvignons in the New World.",
    visited: '2024',
    highlights: ['Don Melchor', 'Almaviva', 'Carmin de Peumo'],
  },
];

export default function WineriesSection() {
  const [selected, setSelected] = useState<Winery | null>(null);
  const reducedMotion = useReducedMotion();
  const handleSelect = useCallback((w: Winery | null) => setSelected(w), []);
  const handleDeselect = useCallback(() => setSelected(null), []);
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <section id="cantine" className="py-32 relative overflow-hidden">
      {/* Section fog — right */}
      <div className="fog-right" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.8) }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">
            {WINERIES.length} WINERIES VISITED
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            WINERIES
          </h2>
          <p
            className="mt-6 text-lg text-[#7a4a4a] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Explore the most legendary wineries in the world that we have visited. Click a marker to discover their story
          </p>
        </motion.div>

        {/* ── Top Wineries ranking ── */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.7) }}
          className="mb-14"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">OUR FINEST VISITS</div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {TOP_WINERIES.map((w, i) => (
              <motion.div
                key={w.rank}
                initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: d(0.55), delay: d(i * 0.09), ease: [0.16, 1, 0.3, 1] }}
                className="group border border-[#e8d5d5] hover:border-[#731515]/30 p-5 transition-all duration-400 hover:bg-[#731515]/5 bg-white"
              >
                <div
                  className="text-[2.6rem] font-bold leading-none text-[#731515]/20 group-hover:text-[#731515]/40 transition-colors duration-300 mb-3 tabular-nums"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {w.rank}
                </div>
                <div className="w-5 h-px bg-[#731515]/30 mb-3 transition-all duration-300 group-hover:w-8 group-hover:bg-[#731515]/60" />
                <div
                  className="text-sm font-medium text-[#1a0505] leading-snug mb-1.5 group-hover:text-[#731515] transition-colors duration-300"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {w.name}
                </div>
                <div className="text-[10px] tracking-[0.25em] text-[#7a4a4a]/70 uppercase" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {w.region} · {w.country}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Globe + info layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Globe */}
          <motion.div
            initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: d(1), ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-3 relative"
          >
            <div className="aspect-square max-h-[560px] w-full mx-auto">
              <WineriesGlobe
                wineries={WINERIES}
                onSelect={handleSelect}
                selected={selected}
              />
            </div>
            <p className="text-center text-[10px] tracking-[0.3em] text-[#7a4a4a]/50 mt-3">
              DRAG · ZOOM · CLICK A MARKER
            </p>
          </motion.div>

          {/* Info panel */}
          <div className="lg:col-span-2 lg:sticky lg:top-28">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : -20 }}
                  transition={{ duration: d(0.4), ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card p-8 relative"
                >
                  <button
                    onClick={handleDeselect}
                    className="absolute top-5 right-5 text-[#C4B5A0] hover:text-[#C9A84C] transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-2">
                    {selected.country.toUpperCase()}
                  </div>
                  <h3
                    className="text-2xl font-medium text-[#1a0505] mb-1"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {selected.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[#7a4a4a] text-xs mb-6">
                    <MapPin size={11} className="text-[#731515]" />
                    <span>{selected.region}</span>
                    <span className="mx-1 text-[#731515]">·</span>
                    <span className="text-[#731515]">Visited in {selected.visited}</span>
                  </div>

                  <div className="w-10 h-px bg-[#731515]/30 mb-6" />

                  <p
                    className="text-[#7a4a4a] text-base leading-relaxed mb-7"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {selected.description}
                  </p>

                  <div>
                    <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-3">
                      WINES TASTED
                    </div>
                    <div className="flex flex-col gap-2">
                      {selected.highlights.map((h) => (
                        <div key={h} className="flex items-center gap-2 text-sm text-[#1a0505]">
                          <Star size={10} className="text-[#731515] fill-[#731515] shrink-0" />
                          <span style={{ fontFamily: 'var(--font-nunito)' }}>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-8"
                >
                  <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-6">
                    OUR WINERIES
                  </div>
                  <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
                    {WINERIES.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => handleSelect(w)}
                        className="text-left p-3 border border-[#e8d5d5] hover:border-[#731515]/40 hover:bg-[#731515]/5 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div
                              className="text-sm text-[#1a0505] group-hover:text-[#731515] transition-colors"
                              style={{ fontFamily: 'var(--font-syne)' }}
                            >
                              {w.name}
                            </div>
                            <div className="text-xs text-[#7a4a4a] mt-0.5">
                              {w.region} · {w.country}
                            </div>
                          </div>
                          <div className="text-[9px] text-[#731515]/60">{w.visited}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
