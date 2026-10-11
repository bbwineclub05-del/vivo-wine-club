'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { SLOGAN_LINES } from '@/lib/brand';

export default function HeroSection() {
  const reducedMotion = useReducedMotion();
  const t = useTranslations('hero');

  // Durations collapse to 0 for users who prefer reduced motion
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <section className="relative min-h-screen min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">

      {/* Video background — landscape, fills the section edge-to-edge on desktop */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/videosito-corto.mp4" type="video/mp4" />
      </video>

      {/* Bordeaux overlay */}
      <div className="absolute inset-0 bg-[#1a0505]/50" style={{ zIndex: 1 }} />

      {/* ── Content ── */}
      <div className="relative z-[2] text-center px-6 max-w-5xl mx-auto w-full">

        <h1 style={{ marginBottom: 'clamp(0.5rem, 2.5vh, 2rem)' }}>
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: reducedMotion ? '0%' : '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: d(1.1), delay: d(0.5), ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="block font-light tracking-[-0.01em] text-white leading-tight"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(1.6rem, 3.5vw + 2.2vh, 4.8rem)' }}
              >
                {SLOGAN_LINES[0]}
              </span>
            </motion.div>
          </div>

          <div className="overflow-hidden">
            <motion.div
              initial={{ y: reducedMotion ? '0%' : '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: d(1.1), delay: d(0.68), ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="block font-light tracking-[-0.01em] text-white leading-tight"
                style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(1.6rem, 3.5vw + 2.2vh, 4.8rem)' }}
              >
                <em className="not-italic" style={{ fontStyle: 'italic', color: '#e8b4b4' }}>
                  {SLOGAN_LINES[1]}
                </em>
              </span>
            </motion.div>
          </div>
        </h1>

        {/* City */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.05) }}
          style={{ marginBottom: 'clamp(0.5rem, 2.2vh, 2rem)' }}
        >
          <span
            className="italic font-light text-white/70"
            style={{ fontFamily: 'var(--font-syne)', fontSize: 'clamp(0.95rem, 1.2vw + 0.6vh, 1.3rem)' }}
          >
            Paris
          </span>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: reducedMotion ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: d(1), delay: d(1.2), ease: [0.16, 1, 0.3, 1] }}
          className="w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto"
          style={{ marginBottom: 'clamp(0.5rem, 2vh, 1.5rem)' }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.4) }}
          className="text-white/70 font-light tracking-wide max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)', fontSize: 'clamp(0.8rem, 1.4vw + 0.8vh, 1.15rem)' }}
        >
          {t('subtitle')}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.65) }}
          className="flex items-center justify-center"
          style={{ marginTop: 'clamp(0.5rem, 2.5vh, 2rem)' }}
        >
          <Link
            href="/membership"
            className="px-11 py-4 bg-[#731515] text-white text-[12px] tracking-[0.35em] hover:bg-[#aa4848] hover:shadow-[0_0_40px_rgba(115,21,21,0.3)] transition-all duration-300 border border-[#731515] rounded-lg"
          >
            {t('cta')}
          </Link>
        </motion.div>

      </div>

    </section>
  );
}
