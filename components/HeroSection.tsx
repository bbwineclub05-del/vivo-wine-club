'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

/* ─── Line-art landmark SVGs ─── */

function EiffelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 38" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="11" y1="0.5" x2="11" y2="4" />
      <path d="M11 4 L8.5 13 L13.5 13" />
      <line x1="8.5" y1="11" x2="13.5" y2="11" />
      <path d="M8.5 13 L6 24 L16 24 L13.5 13" />
      <line x1="7" y1="19" x2="15" y2="19" />
      <path d="M6 24 L3 34 M16 24 L19 34" />
      <line x1="3" y1="34" x2="19" y2="34" />
      <path d="M6 24 Q11 21 16 24" />
    </svg>
  );
}

function MoleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 42" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="10" y1="0.5" x2="10" y2="10" />
      <path d="M10 10 L7.5 18 L12.5 18 Z" />
      <rect x="8.5" y="18" width="3" height="4" />
      <line x1="6" y1="22" x2="6" y2="30" />
      <line x1="14" y1="22" x2="14" y2="30" />
      <line x1="6" y1="22" x2="14" y2="22" />
      <path d="M8.5 25 Q10 23 11.5 25" />
      <rect x="5" y="30" width="10" height="6" />
      <line x1="3" y1="36" x2="17" y2="36" />
      <line x1="1.5" y1="38" x2="18.5" y2="38" />
    </svg>
  );
}

function DuomoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 36" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="14" y1="0.5" x2="14" y2="3.5" />
      <path d="M12 3.5 L12 7.5 L16 7.5 L16 3.5" />
      <path d="M14 7.5 Q5 10 4.5 22 L23.5 22 Q23 10 14 7.5 Z" />
      <line x1="14" y1="7.5" x2="14" y2="22" strokeOpacity="0.35" />
      <rect x="5.5" y="22" width="17" height="5" />
      <path d="M8 22 Q9.5 20 11 22" />
      <path d="M17 22 Q18.5 20 20 22" />
      <rect x="3" y="27" width="22" height="7" />
      <circle cx="14" cy="30.5" r="2.2" />
    </svg>
  );
}

function TorreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 40" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 5 L4 9 M7 5 L7 9 M10 5 L10 9 M13 5 L13 9 M16 5 L16 9" />
      <line x1="4" y1="5" x2="16" y2="5" />
      <line x1="4" y1="9" x2="6" y2="9" />
      <line x1="8" y1="9" x2="10" y2="9" />
      <line x1="12" y1="9" x2="14" y2="9" />
      <line x1="16" y1="5" x2="16" y2="9" />
      <rect x="4" y="9" width="12" height="24" />
      <path d="M8 16 Q10 13.5 12 16 L12 21 L8 21 Z" />
      <line x1="4" y1="26" x2="16" y2="26" strokeOpacity="0.3" />
      <path d="M8 33 Q10 30.5 12 33 L12 33 L8 33" />
      <rect x="2" y="33" width="16" height="3.5" />
      <line x1="0.5" y1="36.5" x2="19.5" y2="36.5" />
    </svg>
  );
}

const CITIES = [
  { name: 'PARIS',   Icon: EiffelIcon },
  { name: 'TORINO',  Icon: MoleIcon },
  { name: 'FIRENZE', Icon: DuomoIcon },
  { name: 'BRESCIA', Icon: TorreIcon },
];

export default function HeroSection() {
  const reducedMotion = useReducedMotion();
  const t = useTranslations('hero');

  // Durations collapse to 0 for users who prefer reduced motion
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <section
      className="relative h-screen h-[100svh] flex flex-col items-center justify-end overflow-hidden"
      style={{ paddingBottom: 'clamp(4rem, 18vh, 9rem)' }}
    >

      {/* Video background — source is a vertical (9:16) reel, so it's shown
          uncropped at full height and centered rather than stretched to
          cover the full (landscape) width */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none object-contain"
        style={{ zIndex: 0 }}
      >
        <source src="/locandina-reel.mp4" type="video/mp4" />
      </video>

      {/* Bordeaux overlay */}
      <div className="absolute inset-0 bg-[#1a0505]/50" style={{ zIndex: 1 }} />

      {/* ── Content ──
          Capped to the rendered width of the (vertical) video column on
          wide viewports, so headline/CTA don't spill past its edges onto
          the bare background on either side. On narrow viewports the video
          is as wide as the screen, so this cap has no effect. */}
      <div
        className="relative z-[2] text-center px-6 mx-auto w-full"
        style={{ maxWidth: 'min(64rem, calc(100svh * 9 / 16))' }}
      >

        {/* Headline, city strip, divider and subtitle temporarily hidden
            per request — only the CTA button remains for now. */}

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.65) }}
          className="flex items-center justify-center"
        >
          <Link
            href="/events/wine-party-versilia-edition-aug-2026"
            className="px-11 py-4 bg-[#731515] text-white text-[12px] tracking-[0.35em] hover:bg-[#aa4848] hover:shadow-[0_0_40px_rgba(115,21,21,0.3)] transition-all duration-300 border border-[#731515] rounded-lg"
          >
            {t('cta')}
          </Link>
        </motion.div>

      </div>

    </section>
  );
}
