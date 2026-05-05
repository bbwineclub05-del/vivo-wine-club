'use client';

const STATS = [
  { value: '15+', label: 'Events hosted' },
  { value: '7',   label: 'Cities', sublabel: 'ACROSS EUROPE' },
  { value: '50+', label: 'Winery partners' },
];

export default function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-[#731515]">
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-8 md:gap-16 divide-y sm:divide-y-0 divide-white/10">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-3 py-6 sm:py-0">
              <span
                className="text-[clamp(2.8rem,6vw,4.5rem)] font-bold leading-none tabular-nums text-white"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {stat.value}
              </span>
              <div className="w-8 h-px bg-white/20" />
              <span
                className="text-[11px] tracking-[0.35em] text-[#e8d5d5]/60 uppercase text-center"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {stat.label}
              </span>
              {stat.sublabel && (
                <span
                  className="text-[9px] tracking-[0.4em] text-white/30 uppercase text-center -mt-2"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {stat.sublabel}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
