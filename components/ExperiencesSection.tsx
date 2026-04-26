'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const EXPERIENCES = [
  {
    id: 1,
    title: 'Wine Party',
    description: 'Themed wine nights with music, curated bottles and a crowd that loves both',
    image: '/events/wine-party1.JPG',
    href: '/experiences/wine-party',
  },
  {
    id: 2,
    title: 'Wine Lounge',
    description: 'The perfect evening in the most interesting wine bars across Europe',
    image: '/events/wine-party6.jpg',
    href: '/experiences/wine-lounge',
  },
  {
    id: 3,
    title: 'Winery Visits',
    description: 'Private cellar tours and guided tastings at iconic estates',
    image: '/events/wine-party3.jpg',
    href: '/experiences/winery-visits',
  },
] as const;

const N = EXPERIENCES.length;

// Defined outside component — never recreated
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0.4 }),
  center: { x: '0%', opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0.4 }),
};

export default function ExperiencesSection() {
  const [[idx, dir], setSlide] = useState([0, 0]);
  const reducedMotion = useReducedMotion();

  const go   = useCallback((next: number, d: number) => setSlide([((next % N) + N) % N, d]), []);
  const prev = useCallback(() => go(idx - 1, -1), [go, idx]);
  const next = useCallback(() => go(idx + 1,  1), [go, idx]);
  const goTo = useCallback((i: number) => { if (i !== idx) go(i, i > idx ? 1 : -1); }, [go, idx]);

  const exp = EXPERIENCES[idx];
  const slideDuration = reducedMotion ? 0 : 0.55;

  return (
    <section id="esperienze" className="py-28 md:py-32 relative overflow-hidden">
      <div className="fog-left" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reducedMotion ? 0 : 0.8 }}
          className="mb-12"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">WHAT WE DO</div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            EXPERIENCES
          </h2>
          <p
            className="mt-6 text-lg text-[#7a4a4a] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Experiences for every taste — from lively wine parties to intimate cellar visits
          </p>
        </motion.div>

        {/* Slider */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Card frame */}
          <div className="relative overflow-hidden rounded-2xl h-[340px] sm:h-[420px] md:h-[520px] lg:h-[560px]">
            <AnimatePresence initial={false} custom={dir}>
              <motion.div
                key={idx}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: slideDuration, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
                style={{ willChange: 'transform' }}
              >
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 90vw"
                  priority={idx === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/5" />

                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                  <div>
                    <div className="text-[9px] tracking-[0.45em] text-white/60 mb-2 sm:mb-3">
                      {String(idx + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
                    </div>
                    <h3
                      className="text-[clamp(1.6rem,5vw,3.5rem)] font-light text-white leading-none mb-2 sm:mb-3"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {exp.title}
                    </h3>
                    <p
                      className="text-sm text-white/70 leading-relaxed max-w-sm hidden sm:block"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {exp.description}
                    </p>
                  </div>

                  <Link
                    href={exp.href}
                    className="self-start sm:self-auto shrink-0 flex items-center gap-2 text-[10px] tracking-[0.3em] text-white border border-white/30 px-5 py-2.5 sm:px-6 sm:py-3 hover:bg-white/10 hover:border-white/60 transition-all duration-300 whitespace-nowrap group"
                  >
                    DISCOVER
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Prev */}
            <button
              onClick={prev}
              aria-label="Previous experience"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors duration-300"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Next */}
            <button
              onClick={next}
              aria-label="Next experience"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors duration-300"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {EXPERIENCES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  i === idx
                    ? 'w-6 h-2 bg-[#731515]'
                    : 'w-2 h-2 bg-[#731515]/30 hover:bg-[#731515]/60'
                }`}
              />
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
