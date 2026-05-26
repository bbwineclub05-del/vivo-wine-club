'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

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

  // Durations collapse to 0 for users who prefer reduced motion
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <section className="relative min-h-screen min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">

      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/videosito vero.mov" type="video/mp4" />
      </video>

      {/* Bordeaux overlay */}
      <div className="absolute inset-0 bg-[#1a0505]/50" style={{ zIndex: 1 }} />

      {/* ── Content ── */}
      <div className="relative z-[2] text-center px-6 max-w-5xl mx-auto w-full">

        <h1 className="mb-10">
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: reducedMotion ? '0%' : '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: d(1.1), delay: d(0.5), ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="block text-[clamp(2.4rem,6.5vw,5.8rem)] font-light tracking-[-0.01em] text-white leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                The art of
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
                className="block text-[clamp(2.4rem,6.5vw,5.8rem)] font-light tracking-[-0.01em] text-white leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                <em className="not-italic" style={{ fontStyle: 'italic', color: '#e8b4b4' }}>
                  fine wine
                </em>
                {', shared.'}
              </span>
            </motion.div>
          </div>
        </h1>

        {/* City strip */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.05) }}
          className="flex items-start justify-center gap-0 mb-10"
        >
          {CITIES.map((city, i) => (
            <div key={city.name} className="flex items-start">
              <div className="flex flex-col items-center gap-2 px-3 sm:px-5 md:px-7">
                <span className="text-[7px] sm:text-[9px] tracking-[0.3em] sm:tracking-[0.45em] text-white/70 font-light">{city.name}</span>
                <city.Icon className="w-4 h-7 sm:w-5 sm:h-8 md:w-6 md:h-9 text-white/40" />
              </div>
              {i < CITIES.length - 1 && (
                <div className="flex flex-col items-center self-start pt-[7px]">
                  <span className="text-white/25 text-xs leading-none select-none">✦</span>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: reducedMotion ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: d(1), delay: d(1.2), ease: [0.16, 1, 0.3, 1] }}
          className="w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-8"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.4) }}
          className="text-[clamp(1rem,2.2vw,1.25rem)] text-white/70 font-light tracking-wide max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          Where young people discover wine: cellar visits, guided tastings and wine parties with music, good vibes and great bottles.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.65) }}
          className="flex items-center justify-center mt-12"
        >
          <Link
            href="/membership"
            className="px-14 py-5 bg-[#731515] text-white text-[13px] tracking-[0.35em] hover:bg-[#aa4848] hover:shadow-[0_0_40px_rgba(115,21,21,0.3)] transition-all duration-300 border border-[#731515]"
          >
            BECOME A MEMBER
          </Link>
        </motion.div>

      </div>

    </section>
  );
}
