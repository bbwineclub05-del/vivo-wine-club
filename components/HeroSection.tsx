'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Fixed at module level — never recreated on re-render
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: `${5 + (i / 8) * 90}%`,
  delay: i * 0.75,
  duration: 8 + (i % 3) * 2,
  size: i % 3 === 0 ? 2 : 1,
}));

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Skip canvas animation when user prefers reduced motion
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;
    let lastFrame = 0;
    const INTERVAL = 1000 / 20; // throttle to 20 fps

    const resize = () => {
      canvas.width  = Math.round(canvas.offsetWidth  / 2);
      canvas.height = Math.round(canvas.offsetHeight / 2);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const BLOBS = [
      { sx: 0.7, sy: 0.4, ax: 0.08, ay: 0.10, fx: 0.7, fy: 0.5, r: 0.38, color: '115,21,21' },
      { sx: 0.5, sy: 0.6, ax: 0.10, ay: 0.08, fx: 0.6, fy: 0.8, r: 0.25, color: '201,168,76' },
    ];

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      if (ts - lastFrame < INTERVAL) return;
      lastFrame = ts;
      t += 0.004;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      BLOBS.forEach((b) => {
        const x = b.sx + Math.sin(t * b.fx) * b.ax;
        const y = b.sy + Math.cos(t * b.fy) * b.ay;
        const grd = ctx.createRadialGradient(
          x * canvas.width, y * canvas.height, 0,
          x * canvas.width, y * canvas.height, b.r * canvas.width
        );
        grd.addColorStop(0, `rgba(${b.color},0.20)`);
        grd.addColorStop(1, `rgba(${b.color},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  // Durations collapse to 0 for users who prefer reduced motion
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="fog-center" />

      {/* Canvas blobs — hidden when reduced motion */}
      {!reducedMotion && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(115,21,21,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(115,21,21,0.4) 1px, transparent 1px)',
          backgroundSize: '90px 90px',
        }}
      />

      {/* Floating particles — skip entirely for reduced motion */}
      {!reducedMotion && PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#731515]"
          style={{ left: p.left, width: p.size, height: p.size, willChange: 'transform, opacity' }}
          animate={{ y: ['100vh', '-5vh'], opacity: [0, 0.3, 0.3, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* ── Content ── */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto w-full">

        <h1 className="mb-10">
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: reducedMotion ? '0%' : '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: d(1.1), delay: d(0.5), ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="block text-[clamp(2.4rem,6.5vw,5.8rem)] font-light tracking-[-0.01em] text-[#1a0505] leading-tight"
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
                className="block text-[clamp(2.4rem,6.5vw,5.8rem)] font-light tracking-[-0.01em] text-[#1a0505] leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                <em className="not-italic" style={{ fontStyle: 'italic', color: '#731515' }}>
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
                <span className="text-[7px] sm:text-[9px] tracking-[0.3em] sm:tracking-[0.45em] text-[#6b3333] font-light">{city.name}</span>
                <city.Icon className="w-4 h-7 sm:w-5 sm:h-8 md:w-6 md:h-9 text-[#6b3333]/50" />
              </div>
              {i < CITIES.length - 1 && (
                <div className="flex flex-col items-center self-start pt-[7px]">
                  <span className="text-[#731515]/30 text-xs leading-none select-none">✦</span>
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
          className="w-32 h-px bg-gradient-to-r from-transparent via-[#731515]/40 to-transparent mx-auto mb-8"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.4) }}
          className="text-[clamp(1rem,2.2vw,1.25rem)] text-[#7a4a4a] font-light tracking-wide max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          Where young people discover wine — from intimate cellar visits and guided
          tastings to themed wine parties with music, good vibes and great bottles.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.9), delay: d(1.65) }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
        >
          <Link
            href="/events"
            className="px-12 py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] hover:shadow-[0_0_40px_rgba(115,21,21,0.3)] transition-all duration-300 border border-[#731515]"
          >
            BUY TICKETS
          </Link>
          <button
            onClick={() => document.querySelector('#cantine')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-12 py-4 border border-[#731515]/40 text-[#731515] text-[11px] tracking-[0.35em] hover:bg-[#731515]/8 hover:border-[#731515]/70 transition-all duration-300"
          >
            OUR WINERIES
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator — skip infinite bounce for reduced motion */}
      <motion.div
        initial={{ opacity: reducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: d(1), delay: d(2.2) }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[9px] tracking-[0.4em] text-[#6b3333]">SCROLL</span>
        {reducedMotion ? (
          <ChevronDown size={18} className="text-[#731515]" />
        ) : (
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={18} className="text-[#731515]" />
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
