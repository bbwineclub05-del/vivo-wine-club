'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MapPin, ArrowRight, X } from 'lucide-react';
import { WINE_REGIONS, type WineRegion } from '@/lib/wineRegions';

const WineriesMap = dynamic(() => import('./WineriesMap'), { ssr: false });

export default function WineriesSection() {
  const [selected, setSelected] = useState<WineRegion | null>(null);
  const reducedMotion = useReducedMotion();
  const handleSelect   = useCallback((r: WineRegion | null) => setSelected(r), []);
  const handleDeselect = useCallback(() => setSelected(null), []);
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <section id="cantine" className="py-32 relative overflow-hidden">
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
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">EXPLORE THE REGIONS</div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            WINE MAP
          </h2>
          <p
            className="mt-6 text-lg text-[#7a4a4a] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            The great wine regions of Europe — drag the globe, click a marker to discover each zone
          </p>
        </motion.div>

        {/* Globe + info panel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* Globe */}
          <motion.div
            initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: d(1), ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-3 relative"
          >
            <div className="w-full" style={{ aspectRatio: '800 / 580' }}>
              <WineriesMap
                regions={WINE_REGIONS}
                onSelect={handleSelect}
                selected={selected}
              />
            </div>
            <p className="text-center text-[10px] tracking-[0.3em] text-[#7a4a4a]/50 mt-3">
              CLICK A MARKER TO EXPLORE THE REGION
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
                  transition={{ duration: d(0.35), ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card p-8 relative"
                >
                  {/* Close */}
                  <button
                    onClick={handleDeselect}
                    className="absolute top-5 right-5 text-[#7a4a4a]/40 hover:text-[#731515] transition-colors"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>

                  {/* Country */}
                  <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-2">
                    {selected.country.toUpperCase()}
                  </div>

                  {/* Name */}
                  <h3
                    className="text-2xl font-medium text-[#1a0505] mb-3"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {selected.name}
                  </h3>

                  {/* Location pill */}
                  <div className="flex items-center gap-1.5 text-[#7a4a4a] text-xs mb-6">
                    <MapPin size={11} className="text-[#731515] shrink-0" />
                    <span>{selected.name}, {selected.country}</span>
                  </div>

                  <div className="w-10 h-px bg-[#731515]/25 mb-6" />

                  {/* Short description */}
                  <p
                    className="text-[#7a4a4a] text-sm leading-relaxed mb-6"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {selected.shortDesc}
                  </p>

                  {/* Key grapes */}
                  <div className="mb-7">
                    <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-2">KEY GRAPES</div>
                    <div className="flex flex-wrap gap-2">
                      {selected.grapes.map((g) => (
                        <span
                          key={g}
                          className="text-[10px] tracking-[0.15em] px-3 py-1 border border-[#731515]/20 text-[#7a4a4a] rounded-full"
                          style={{ fontFamily: 'var(--font-nunito)' }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Discover More CTA */}
                  <Link
                    href={`/wine-regions/${selected.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#aa4848] transition-colors duration-300 group"
                  >
                    DISCOVER MORE
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: d(0.3) }}
                  className="glass-card p-8"
                >
                  <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-5">WINE REGIONS</div>
                  <p
                    className="text-sm text-[#7a4a4a] mb-6 leading-relaxed"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Click any marker on the globe to discover a wine region.
                  </p>
                  <div className="flex flex-col gap-2">
                    {WINE_REGIONS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r)}
                        className="text-left px-4 py-3 border border-[#e8d5d5] hover:border-[#731515]/40 hover:bg-[#731515]/5 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-sm text-[#1a0505] group-hover:text-[#731515] transition-colors"
                            style={{ fontFamily: 'var(--font-syne)' }}
                          >
                            {r.name}
                          </span>
                          <span className="text-[9px] tracking-[0.2em] text-[#7a4a4a]/50">
                            {r.country.toUpperCase()}
                          </span>
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
