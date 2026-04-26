'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MapPin, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { WINE_REGIONS, type WineRegion } from '@/lib/wineRegions';

const WineriesMap = dynamic(() => import('@/components/WineriesMap'), { ssr: false });

/* ── Top estates data ── */
const TOP_ESTATES = [
  { rank: '01', name: 'Château Latour',          location: 'Pauillac, Bordeaux',    logo: '/wineries/chateau-latour.webp',  slug: 'chateau-latour'           },
  { rank: '02', name: 'Château Mouton Rothschild', location: 'Pauillac, Bordeaux',  logo: '/wineries/chateau-mouton.jpg',   slug: 'chateau-mouton-rothschild'},
  { rank: '03', name: 'Château Margaux',          location: 'Margaux, Bordeaux',     logo: '/wineries/chateau-margaux.png',  slug: 'chateau-margaux'          },
  { rank: '04', name: "Ca' del Bosco",            location: 'Franciacorta, Italy',   logo: null,                             slug: 'ca-del-bosco'             },
  { rank: '05', name: 'Gaja',                     location: 'Barbaresco, Italy',     logo: '/wineries/gaja.webp',            slug: 'gaja'                     },
] as const;

/* ── Bottle icon (for estates without logo) ── */
function BottleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8" />
      <path d="M9 2v2.5c0 .8-.4 1.5-1 2L6 8.5C5.4 9 5 9.7 5 10.5V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9.5c0-.8-.4-1.5-1-2L16 6.5c-.6-.5-1-1.2-1-2V2" />
    </svg>
  );
}

/* ── Ranking row ── */
function RankRow({ estate, index, reducedMotion }: {
  estate: (typeof TOP_ESTATES)[number];
  index: number;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/wineries/${estate.slug}`}
        className="flex items-center gap-5 md:gap-8 py-5 md:py-6 group"
      >
        {/* Rank number */}
        <span
          className="text-[2.2rem] md:text-[2.8rem] font-light tabular-nums leading-none text-[#731515]/15 group-hover:text-[#731515]/30 transition-colors duration-300 shrink-0 w-12 md:w-16 text-right"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {estate.rank}
        </span>

        {/* Logo thumbnail */}
        <div className="relative bg-white border border-[#e8d5d5] group-hover:border-[#731515]/30 transition-colors duration-300 shrink-0 flex items-center justify-center"
          style={{ width: 64, height: 48 }}>
          {estate.logo ? (
            <Image
              src={estate.logo}
              alt={estate.name}
              fill
              className="object-contain p-2"
              sizes="64px"
            />
          ) : (
            <span className="text-[#731515]/30 group-hover:text-[#731515]/50 transition-colors duration-300">
              <BottleIcon />
            </span>
          )}
        </div>

        {/* Name + location */}
        <div className="flex-1 min-w-0">
          <div
            className="text-base md:text-lg font-medium text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300 leading-snug truncate"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {estate.name}
          </div>
          <div
            className="text-[11px] tracking-[0.15em] text-[#7a4a4a]/60 mt-0.5"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {estate.location}
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={16}
          className="shrink-0 text-[#731515]/30 group-hover:text-[#731515] group-hover:translate-x-0.5 transition-all duration-300"
        />
      </Link>
    </motion.div>
  );
}

/* ── Page ── */
export default function WineMapPage() {
  const [selected, setSelected] = useState<WineRegion | null>(null);
  const reducedMotion = useReducedMotion();
  const handleSelect   = useCallback((r: WineRegion | null) => setSelected(r), []);
  const handleDeselect = useCallback(() => setSelected(null), []);
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-10 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>

            <motion.div
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: d(0.8) }}
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">EXPLORE</div>
              <h1
                className="text-[clamp(3rem,8vw,6rem)] font-light text-[#1a0505] leading-none section-title mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Our Wine Map
              </h1>
              <p
                className="text-base md:text-lg text-[#7a4a4a] font-light max-w-xl leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Every pin tells a story. Explore the regions we&apos;ve visited and the estates that left a mark.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── INTERACTIVE MAP ── */}
        <section className="relative overflow-hidden pb-24">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-7xl mx-auto px-6 lg:px-10">

            <motion.div
              initial={{ scaleX: reducedMotion ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14"
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

              {/* Map */}
              <motion.div
                initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
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
                      exit={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : -16 }}
                      transition={{ duration: d(0.3), ease: [0.16, 1, 0.3, 1] }}
                      className="glass-card p-8 relative"
                    >
                      <button
                        onClick={handleDeselect}
                        className="absolute top-5 right-5 text-[#7a4a4a]/40 hover:text-[#731515] transition-colors"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>

                      <div className="text-[9px] tracking-[0.4em] text-[#731515] mb-2">
                        {selected.country.toUpperCase()}
                      </div>
                      <h3
                        className="text-2xl font-medium text-[#1a0505] mb-3"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {selected.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[#7a4a4a] text-xs mb-6">
                        <MapPin size={11} className="text-[#731515] shrink-0" />
                        <span>{selected.name}, {selected.country}</span>
                      </div>

                      <div className="w-10 h-px bg-[#731515]/25 mb-6" />

                      <p
                        className="text-[#7a4a4a] text-sm leading-relaxed mb-6"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {selected.shortDesc}
                      </p>

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
                        Click any marker on the map to discover a wine region.
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

        {/* ── TOP ESTATES RANKING ── */}
        <section className="relative overflow-hidden pb-24">
          <div className="fog-left" style={{ top: '20%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            <motion.div
              initial={{ scaleX: reducedMotion ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14"
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-start">

              {/* Label */}
              <motion.div
                initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: d(0.7) }}
              >
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">OUR FINEST VISITS</div>
                <h2
                  className="text-[clamp(2rem,5vw,3.5rem)] font-light text-[#1a0505] leading-tight"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  Top<br />Estates
                </h2>
                <p
                  className="mt-5 text-sm text-[#7a4a4a] font-light leading-relaxed max-w-xs"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  The five estates that defined our journey so far — ranked by the depth of the impression they left.
                </p>
              </motion.div>

              {/* List */}
              <div>
                {TOP_ESTATES.map((estate, i) => (
                  <div key={estate.slug}>
                    <RankRow estate={estate} index={i} reducedMotion={reducedMotion} />
                    {i < TOP_ESTATES.length - 1 && (
                      <div className="h-px bg-[#731515]/8" />
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            <motion.div
              initial={{ scaleX: reducedMotion ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#e8d5d5]">

              {[
                { value: '9',          label: 'Regions visited',  sub: 'Across France & Italy' },
                { value: '20+',        label: 'Estates visited',  sub: 'And counting'           },
                { value: 'FR · IT',    label: 'Countries',        sub: 'France and Italy'       },
              ].map(({ value, label, sub }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: d(0.7), delay: reducedMotion ? 0 : i * 0.1 }}
                  className="flex flex-col items-center text-center py-10 sm:py-0 px-6"
                >
                  <span
                    className="text-[clamp(2.8rem,7vw,4.5rem)] font-light text-[#731515] leading-none mb-2"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {value}
                  </span>
                  <span
                    className="text-[10px] tracking-[0.35em] text-[#1a0505] mb-1"
                  >
                    {label.toUpperCase()}
                  </span>
                  <span
                    className="text-xs text-[#7a4a4a]/60"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {sub}
                  </span>
                </motion.div>
              ))}
            </div>

          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
