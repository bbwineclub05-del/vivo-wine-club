'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
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
  { rank: '04', name: "Ca' del Bosco",            location: 'Franciacorta, Italy',   logo: '/wineries/Ca-del-Bosco.png',     slug: 'ca-del-bosco'             },
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

/* ── Country flag SVGs (inline, no emoji) ── */
function FlagIT() {
  return (
    <svg width="22" height="15" viewBox="0 0 22 15" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
      <rect width="22" height="15" fill="#CE2B37" />
      <rect width="14.67" height="15" fill="#FFFFFF" />
      <rect width="7.33" height="15" fill="#009246" />
    </svg>
  );
}
function FlagFR() {
  return (
    <svg width="22" height="15" viewBox="0 0 22 15" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
      <rect width="22" height="15" fill="#ED2939" />
      <rect width="14.67" height="15" fill="#FFFFFF" />
      <rect width="7.33" height="15" fill="#002395" />
    </svg>
  );
}
function FlagPT() {
  return (
    <svg width="22" height="15" viewBox="0 0 22 15" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
      <rect width="22" height="15" fill="#FF0000" />
      <rect width="8.8" height="15" fill="#006600" />
      <circle cx="8.8" cy="7.5" r="3" fill="#FFD700" opacity="0.85" />
      <circle cx="8.8" cy="7.5" r="2" fill="#FF0000" />
      <circle cx="8.8" cy="7.5" r="1.1" fill="#FFD700" opacity="0.85" />
    </svg>
  );
}

const COUNTRY_META: Record<string, { label: string; Flag: () => React.ReactElement }> = {
  Italy:    { label: 'Italy',    Flag: FlagIT },
  France:   { label: 'France',   Flag: FlagFR },
  Portugal: { label: 'Portugal', Flag: FlagPT },
};

/* ── Animated counter stat ── */
function CounterStat({ to, suffix = '', label, sub, delay = 0 }: {
  to: number; suffix?: string; label: string; sub?: string; delay?: number;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const val    = useMotionValue(0);
  const disp   = useTransform(val, (v) => Math.round(v));
  const rm     = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (rm) { val.set(to); return; }
    const ctrl = animate(val, to, { duration: 1.6, delay, ease: [0.16, 1, 0.3, 1] });
    return ctrl.stop;
  }, [inView, val, to, delay, rm]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center px-4 sm:px-8 py-6 sm:py-8">
      <div className="h-[clamp(2.4rem,5vw,4rem)] flex items-center justify-center mb-2">
        <span
          className="text-[clamp(2.4rem,5vw,4rem)] font-medium text-[#731515] leading-none tabular-nums"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          <motion.span>{disp}</motion.span>{suffix}
        </span>
      </div>
      <div className="text-[9px] tracking-[0.4em] text-[#1a0505] mb-1">{label}</div>
      {sub && (
        <div className="text-[11px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── Static text stat (no counter) ── */
function TextStat({ value, label, sub, delay = 0 }: {
  value: string; label: string; sub?: string; delay?: number;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const rm     = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: rm ? 1 : 0, y: rm ? 0 : 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: rm ? 0 : 0.7, delay: rm ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center px-4 sm:px-8 py-6 sm:py-8"
    >
      <div className="h-[clamp(2.4rem,5vw,4rem)] flex items-center justify-center mb-2">
        <span
          className="text-[clamp(2.4rem,5vw,4rem)] font-medium text-[#731515] leading-none whitespace-nowrap"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {value}
        </span>
      </div>
      <div className="text-[9px] tracking-[0.4em] text-[#1a0505] mb-1">{label}</div>
      {sub && (
        <div className="text-[11px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          {sub}
        </div>
      )}
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
      <main className="min-h-screen pt-16">

        {/* ── HERO IMAGE ── */}
        <div className="relative w-full h-[220px] sm:h-[280px] md:h-[350px]">
          <Image
            src="/castello.jpg"
            alt="Wine Map — Vivo Wine Club"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#731515]/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">EXPLORE</div>
            <h1
              className="text-[clamp(2rem,5vw,4rem)] font-light text-white leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Wine Visits
            </h1>
            <p
              className="mt-4 text-sm md:text-base text-white/75 font-light italic max-w-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Every pin tells a story. Explore the regions we&apos;ve visited and the estates that left a mark.
            </p>
          </div>
          <div className="absolute top-6 left-6 md:left-10 z-10">
            <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300" />
          </div>
        </div>

        {/* ── INTERACTIVE MAP ── */}
        <section className="relative overflow-hidden pb-24">
          <div className="fog-right" style={{ top: '10%' }} />

          {/* Divider — kept in a padded container */}
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <motion.div
              initial={{ scaleX: reducedMotion ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14"
            />
          </div>

          {/* Full-bleed grid: map left-edge, panel right-edge */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 items-start">

              {/* Map — touches left edge */}
              <motion.div
                initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-3 relative pl-0"
              >
                <div className="w-full" style={{ aspectRatio: '800 / 580' }}>
                  <WineriesMap
                    regions={WINE_REGIONS}
                    onSelect={handleSelect}
                    selected={selected}
                  />
                </div>
                <p className="text-center text-[10px] tracking-[0.3em] text-[#7a4a4a]/50 mt-3 px-6">
                  CLICK A MARKER TO EXPLORE THE REGION
                </p>
              </motion.div>

              {/* Info panel — same height as map on desktop; auto height on mobile */}
              <div className="lg:col-span-2 lg:h-[43.5vw] overflow-hidden">
                <AnimatePresence mode="wait">
                  {selected ? (
                    <motion.div
                      key={selected.id}
                      initial={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : -16 }}
                      transition={{ duration: d(0.3), ease: [0.16, 1, 0.3, 1] }}
                      className="glass-card p-6 lg:p-8 relative max-h-[70vh] lg:max-h-none lg:h-full overflow-y-auto"
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
                      className="glass-card p-5 lg:p-7 max-h-[70vh] lg:max-h-none lg:h-full overflow-y-auto"
                    >
                      {/* Panel header */}
                      <div className="mb-6">
                        <div className="text-[9px] tracking-[0.5em] text-[#731515] mb-2">WINE MAP</div>
                        <p
                          className="text-xs text-[#7a4a4a]/70 leading-relaxed"
                          style={{ fontFamily: 'var(--font-nunito)' }}
                        >
                          Select a marker or a region below.
                        </p>
                      </div>

                      {/* Grouped by country */}
                      <div className="flex flex-col gap-6">
                        {Object.entries(
                          WINE_REGIONS.reduce<Record<string, typeof WINE_REGIONS>>((acc, r) => {
                            (acc[r.country] ??= []).push(r);
                            return acc;
                          }, {})
                        ).map(([country, regions], groupIdx) => {
                          const meta = COUNTRY_META[country];
                          const Flag = meta?.Flag;
                          return (
                            <div key={country}>
                              {/* Country header */}
                              <div className="flex items-center gap-2.5 mb-3">
                                {Flag && <Flag />}
                                <span
                                  className="text-[9px] tracking-[0.4em] text-[#7a4a4a]/60 uppercase"
                                  style={{ fontFamily: 'var(--font-nunito)' }}
                                >
                                  {meta?.label ?? country}
                                </span>
                                <div className="flex-1 h-px bg-[#e8d5d5]" />
                              </div>

                              {/* Region rows */}
                              <div className="flex flex-col">
                                {regions.map((r, i) => (
                                  <button
                                    key={r.id}
                                    onClick={() => handleSelect(r)}
                                    className={`group relative text-left flex items-center justify-between gap-3 py-3 px-3 -mx-3 transition-all duration-200 hover:bg-[#731515]/5 ${
                                      i < regions.length - 1 ? 'border-b border-[#f0e4e4]' : ''
                                    }`}
                                  >
                                    {/* Left accent line on hover */}
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-[#731515] group-hover:h-5 transition-all duration-200 rounded-full" />

                                    <div className="min-w-0">
                                      <div
                                        className="text-sm font-medium text-[#1a0505] group-hover:text-[#731515] transition-colors duration-200 leading-snug"
                                        style={{ fontFamily: 'var(--font-syne)' }}
                                      >
                                        {r.name}
                                      </div>
                                      <div
                                        className="text-[10px] text-[#7a4a4a]/50 mt-0.5 truncate"
                                        style={{ fontFamily: 'var(--font-nunito)' }}
                                      >
                                        {r.grapes[0]}
                                      </div>
                                    </div>

                                    <ArrowRight
                                      size={13}
                                      className="shrink-0 text-[#731515]/20 group-hover:text-[#731515] group-hover:translate-x-0.5 transition-all duration-200"
                                    />
                                  </button>
                                ))}
                              </div>

                              {/* Separator between country groups */}
                              {groupIdx < Object.keys(WINE_REGIONS.reduce((a, r) => ({ ...a, [r.country]: true }), {})).length - 1 && (
                                <div className="mt-2 h-px bg-gradient-to-r from-[#731515]/15 via-[#731515]/5 to-transparent" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
        <section className="relative overflow-hidden pb-12 md:pb-16">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            <motion.div
              initial={{ scaleX: reducedMotion ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-10"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#e8d5d5]">
              <CounterStat to={10} suffix="+" label="REGIONS VISITED" sub="Across Europe" delay={0} />
              <CounterStat to={80} suffix="+" label="ESTATES VISITED"  sub="And counting"  delay={0.1} />
              <TextStat    value="FR · IT · PT" label="COUNTRIES"      sub="France, Italy and Portugal" delay={0.2} />
            </div>

          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
