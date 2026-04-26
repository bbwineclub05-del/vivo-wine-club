'use client';

const STATS = [
  { value: '15+',  label: 'Events hosted' },
  { value: '2026', label: 'Founded at ESCP, Paris' },
  { value: '25+',  label: 'Winery partners' },
];

export default function StatsSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="fog-right" style={{ top: '-10%', height: '120%' }} />
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-8 md:gap-16 divide-y sm:divide-y-0 divide-[#e8d5d5]">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-3 py-8 sm:py-0">
              <span
                className="text-[clamp(3.5rem,8vw,6rem)] font-bold leading-none tabular-nums"
                style={{ fontFamily: 'var(--font-syne)', color: '#731515' }}
              >
                {stat.value}
              </span>
              <div className="w-8 h-px bg-[#731515]/30" />
              <span
                className="text-[11px] tracking-[0.35em] text-[#7a4a4a] uppercase text-center"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
