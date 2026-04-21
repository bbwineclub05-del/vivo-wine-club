'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

const STATS = [
  { value: 15, suffix: '+', label: 'Events hosted' },
  { value: 2026, suffix: '', label: 'Founded at ESCP, Paris' },
  { value: 25, suffix: '+', label: 'Winery partners' },
];

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    startTimeRef.current = null;

    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(easeOutQuart(progress) * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration]);

  return count;
}

function StatItem({
  value,
  suffix,
  label,
  active,
  index,
}: (typeof STATS)[number] & { active: boolean; index: number }) {
  const count = useCountUp(value, 2000, active);

  return (
    <div
      className="flex flex-col items-center gap-3 opacity-0 translate-y-4"
      style={{
        animation: active
          ? `statFadeIn 0.6s ${index * 0.15}s ease forwards`
          : undefined,
      }}
    >
      {/* Number */}
      <span
        className="text-[clamp(3.5rem,8vw,6rem)] font-bold leading-none tabular-nums"
        style={{ fontFamily: 'var(--font-syne)', color: '#731515' }}
      >
        {count}
        {suffix}
      </span>

      {/* Divider */}
      <div className="w-8 h-px bg-[#C9A84C]/30" />

      {/* Label */}
      <span
        className="text-[11px] tracking-[0.35em] text-[#C4B5A0]/70 uppercase text-center"
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        {label}
      </span>
    </div>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <>
      {/* Keyframe injected once via a style tag */}
      <style>{`
        @keyframes statFadeIn {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <section ref={ref} className="py-20 bg-[#0d0203]">
        {/* Subtle top/bottom borders */}
        <div className="border-t border-b border-[#C9A84C]/8">
          <div className="max-w-4xl mx-auto px-6 lg:px-10 py-16">
            <div className="grid grid-cols-3 gap-8 md:gap-16">
              {STATS.map((stat, i) => (
                <StatItem key={stat.label} {...stat} active={isInView} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
