'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const WORDS = ['VIVO', 'WINE', 'CLUB'];

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${5 + Math.random() * 90}%`,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 6,
  size: Math.random() > 0.6 ? 2 : 1,
}));

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle animated canvas background
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

      // Animated blobs
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
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(201,168,76,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.6) 1px, transparent 1px)',
          backgroundSize: '90px 90px',
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#C9A84C]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: ['100vh', '-5vh'],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, letterSpacing: '0.2em' }}
          animate={{ opacity: 1, letterSpacing: '0.5em' }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="text-[10px] text-[#C9A84C] mb-10 font-light"
        >
          EST. 2020 &nbsp;·&nbsp; ITALIA
        </motion.div>

        {/* Main title */}
        <h1 className="flex flex-wrap justify-center gap-x-6 md:gap-x-10 mb-6">
          {WORDS.map((word, i) => (
            <div key={word} className="overflow-hidden">
              <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{
                  duration: 1.1,
                  delay: 0.5 + i * 0.18,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="block text-[clamp(3rem,12vw,9rem)] font-light tracking-[0.12em] text-[#F5EEE6] leading-none"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {word}
              </motion.span>
            </div>
          ))}
        </h1>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-36 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent mx-auto my-8"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.3 }}
          className="text-[clamp(1.1rem,2.5vw,1.4rem)] text-[#C4B5A0] font-light italic tracking-wide max-w-xl mx-auto leading-relaxed"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          Esperienze enologiche esclusive per i veri appassionati del vino
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-14"
        >
          <button
            onClick={() => document.querySelector('#eventi')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-12 py-4 bg-[#7B1F1F] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#9B3333] hover:shadow-[0_0_40px_rgba(123,31,31,0.5)] transition-all duration-400 border border-[#7B1F1F]"
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
