'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${5 + Math.random() * 90}%`,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 6,
  size: Math.random() > 0.6 ? 2 : 1,
}));

/* ─── Line-art landmark SVGs ─── */

function EiffelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 38" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Antenna */}
      <line x1="11" y1="0.5" x2="11" y2="4" />
      {/* Upper body */}
      <path d="M11 4 L8.5 13 L13.5 13" />
      {/* Cross beam 1 */}
      <line x1="8.5" y1="11" x2="13.5" y2="11" />
      {/* Mid body */}
      <path d="M8.5 13 L6 24 L16 24 L13.5 13" />
      {/* Cross beam 2 */}
      <line x1="7" y1="19" x2="15" y2="19" />
      {/* Legs */}
      <path d="M6 24 L3 34 M16 24 L19 34" />
      {/* Base */}
      <line x1="3" y1="34" x2="19" y2="34" />
      {/* Arch */}
      <path d="M6 24 Q11 21 16 24" />
    </svg>
  );
}

function MoleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 42" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Needle spire */}
      <line x1="10" y1="0.5" x2="10" y2="10" />
      {/* Pyramid cap */}
      <path d="M10 10 L7.5 18 L12.5 18 Z" />
      {/* Lantern box */}
      <rect x="8.5" y="18" width="3" height="4" />
      {/* Portico columns */}
      <line x1="6" y1="22" x2="6" y2="30" />
      <line x1="14" y1="22" x2="14" y2="30" />
      <line x1="6" y1="22" x2="14" y2="22" />
      {/* Arch window */}
      <path d="M8.5 25 Q10 23 11.5 25" />
      {/* Base body */}
      <rect x="5" y="30" width="10" height="6" />
      {/* Ground steps */}
      <line x1="3" y1="36" x2="17" y2="36" />
      <line x1="1.5" y1="38" x2="18.5" y2="38" />
    </svg>
  );
}

function DuomoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 36" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Lantern */}
      <line x1="14" y1="0.5" x2="14" y2="3.5" />
      <path d="M12 3.5 L12 7.5 L16 7.5 L16 3.5" />
      {/* Dome curve — Brunelleschi's double shell */}
      <path d="M14 7.5 Q5 10 4.5 22 L23.5 22 Q23 10 14 7.5 Z" />
      {/* Ribbing suggestion */}
      <line x1="14" y1="7.5" x2="14" y2="22" strokeOpacity="0.35" />
      {/* Drum / octagonal tambour */}
      <rect x="5.5" y="22" width="17" height="5" />
      {/* Arcade arches on drum */}
      <path d="M8 22 Q9.5 20 11 22" />
      <path d="M17 22 Q18.5 20 20 22" />
      {/* Nave facade */}
      <rect x="3" y="27" width="22" height="7" />
      {/* Rose window */}
      <circle cx="14" cy="30.5" r="2.2" />
    </svg>
  );
}

function TorreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 40" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Merlons / battlements */}
      <path d="M4 5 L4 9 M7 5 L7 9 M10 5 L10 9 M13 5 L13 9 M16 5 L16 9" />
      <line x1="4" y1="5" x2="16" y2="5" />
      {/* Merlon tops (flat) */}
      <line x1="4" y1="9" x2="6" y2="9" />
      <line x1="8" y1="9" x2="10" y2="9" />
      <line x1="12" y1="9" x2="14" y2="9" />
      <line x1="16" y1="5" x2="16" y2="9" />
      {/* Tower body */}
      <rect x="4" y="9" width="12" height="24" />
      {/* Arched window */}
      <path d="M8 16 Q10 13.5 12 16 L12 21 L8 21 Z" />
      {/* Brickwork hint */}
      <line x1="4" y1="26" x2="16" y2="26" strokeOpacity="0.3" />
      {/* Door arch */}
      <path d="M8 33 Q10 30.5 12 33 L12 33 L8 33" />
      {/* Base */}
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      t += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const blobs = [
        { x: 0.3 + Math.sin(t * 0.7) * 0.08, y: 0.4 + Math.cos(t * 0.5) * 0.1, r: 0.35, color: '123,31,31' },
        { x: 0.7 + Math.cos(t * 0.6) * 0.1, y: 0.6 + Math.sin(t * 0.8) * 0.08, r: 0.28, color: '74,14,14' },
        { x: 0.5 + Math.sin(t) * 0.15, y: 0.25 + Math.cos(t * 0.4) * 0.1, r: 0.2, color: '201,168,76' },
      ];

      blobs.forEach((b) => {
        const grd = ctx.createRadialGradient(
          b.x * canvas.width, b.y * canvas.height, 0,
          b.x * canvas.width, b.y * canvas.height, b.r * canvas.width
        );
        grd.addColorStop(0, `rgba(${b.color},0.18)`);
        grd.addColorStop(1, `rgba(${b.color},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0a0204]">
      {/* Canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)',
          backgroundSize: '90px 90px',
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#C9A84C]"
          style={{ left: p.left, width: p.size, height: p.size }}
          animate={{ y: ['100vh', '-5vh'], opacity: [0, 0.6, 0.6, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* ── Content ── */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto w-full">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, letterSpacing: '0.2em' }}
          animate={{ opacity: 1, letterSpacing: '0.5em' }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="text-[10px] text-[#C9A84C] mb-10 font-light"
        >
          EST. 2020 &nbsp;·&nbsp; ITALIA
        </motion.div>

        {/* ── Main title ── */}
        <h1 className="mb-10">
          {/* Line 1 */}
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="block text-[clamp(2.4rem,6.5vw,5.8rem)] font-light tracking-[-0.01em] text-[#F5EEE6] leading-tight"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                The art of
              </span>
            </motion.div>
          </div>

          {/* Line 2 */}
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, delay: 0.68, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="block text-[clamp(2.4rem,6.5vw,5.8rem)] font-light tracking-[-0.01em] text-[#F5EEE6] leading-tight"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                <em
                  className="not-italic"
                  style={{ fontStyle: 'italic', color: '#9B3333' }}
                >
                  fine wine
                </em>
                {', shared.'}
              </span>
            </motion.div>
          </div>
        </h1>

        {/* ── City strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.05 }}
          className="flex items-start justify-center gap-0 mb-10"
        >
          {CITIES.map((city, i) => (
            <div key={city.name} className="flex items-start">
              {/* City block */}
              <div className="flex flex-col items-center gap-2 px-5 md:px-7">
                <span className="text-[9px] tracking-[0.45em] text-[#C4B5A0] font-light">
                  {city.name}
                </span>
                <city.Icon className="w-5 h-8 text-[#C4B5A0]/60 md:w-6 md:h-9" />
              </div>

              {/* Separator — except after last */}
              {i < CITIES.length - 1 && (
                <div className="flex flex-col items-center self-start pt-[7px]">
                  <span className="text-[#C9A84C]/30 text-xs leading-none select-none">✦</span>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-32 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent mx-auto mb-8"
        />

        {/* ── Subtitle ── */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.4 }}
          className="text-[clamp(1rem,2.2vw,1.25rem)] text-[#C4B5A0] font-light tracking-wide max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          Where young people discover wine — from intimate cellar visits and guided
          tastings to themed wine parties with music, good vibes and great bottles.
        </motion.p>

        {/* ── CTA buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.65 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
        >
          <button
            onClick={() => document.querySelector('#eventi')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-12 py-4 bg-[#7B1F1F] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#9B3333] hover:shadow-[0_0_40px_rgba(123,31,31,0.45)] transition-all duration-300 border border-[#7B1F1F]"
          >
            SCOPRI GLI EVENTI
          </button>
          <button
            onClick={() => document.querySelector('#cantine')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-12 py-4 border border-[#C9A84C]/40 text-[#C9A84C] text-[11px] tracking-[0.35em] hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/70 transition-all duration-300"
          >
            LE NOSTRE CANTINE
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[9px] tracking-[0.4em] text-[#C4B5A0]">SCORRI</span>
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={18} className="text-[#C9A84C]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
