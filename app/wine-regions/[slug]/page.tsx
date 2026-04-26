import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getRegionBySlug, WINE_REGIONS, type WineRegion } from '@/lib/wineRegions';

/* ── Static params — generate a page for every region at build time ── */
export function generateStaticParams() {
  return WINE_REGIONS.map((r) => ({ slug: r.slug }));
}

/* ── Bottle icon ── */
function BottleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8" />
      <path d="M9 2v2.5c0 .8-.4 1.5-1 2L6 8.5C5.4 9 5 9.7 5 10.5V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9.5c0-.8-.4-1.5-1-2L16 6.5c-.6-.5-1-1.2-1-2V2" />
    </svg>
  );
}

/* ── Real winery card ── */
function WineryCard({ name, index }: { name: string; index: number }) {
  return (
    <div className="border border-[#e8d5d5] bg-white p-6 flex flex-col gap-3 hover:border-[#731515]/40 transition-colors duration-300 group">
      <div className="flex items-start justify-between gap-2">
        <div
          className="text-[2rem] font-bold leading-none text-[#731515]/12 tabular-nums"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
        <span className="text-[8px] tracking-[0.3em] px-2.5 py-1 bg-[#731515] text-white shrink-0">
          VISITED
        </span>
      </div>
      <div className="w-5 h-px bg-[#731515]/25" />
      <div className="flex items-center gap-2 text-[#731515]/60 group-hover:text-[#731515] transition-colors duration-300">
        <BottleIcon />
      </div>
      <div
        className="text-sm font-medium text-[#1a0505] leading-snug"
        style={{ fontFamily: 'var(--font-syne)' }}
      >
        {name}
      </div>
    </div>
  );
}

/* ── "And many more" trailing card ── */
function MoreCard() {
  return (
    <div className="border border-dashed border-[#c9a0a0] bg-white/60 p-6 flex flex-col items-center justify-center gap-2 text-center">
      <div className="text-[#731515]/40">
        <BottleIcon />
      </div>
      <p
        className="text-[11px] tracking-[0.2em] text-[#7a4a4a]/60 italic"
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        ...and many more
      </p>
    </div>
  );
}

/* ── Page ── */
export default async function WineRegionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const region: WineRegion | undefined = getRegionBySlug(slug);
  if (!region) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-10 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>

            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">WINE REGION</div>
            <h1
              className="text-[clamp(3rem,8vw,6.5rem)] font-light text-[#1a0505] leading-none section-title mb-5"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {region.name}
            </h1>

            <div className="flex items-center gap-2 text-sm text-[#7a4a4a]">
              <MapPin size={13} className="text-[#731515] shrink-0" />
              <span>{region.name}, {region.country}</span>
            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section className="relative overflow-hidden pb-20 md:pb-24">
          <div className="fog-left" style={{ top: '10%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

              {/* Label + key grapes */}
              <div>
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-6">ABOUT THIS REGION</div>
                <div className="mb-8">
                  <div className="text-[10px] tracking-[0.4em] text-[#7a4a4a]/70 mb-3">KEY GRAPES</div>
                  <div className="flex flex-wrap gap-2">
                    {region.grapes.map((g) => (
                      <span
                        key={g}
                        className="text-[11px] tracking-[0.15em] px-4 py-1.5 border border-[#731515]/20 text-[#7a4a4a] rounded-full"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.4em] text-[#7a4a4a]/70 mb-3">MUST-TRY WINES</div>
                  <ul className="flex flex-col gap-2">
                    {region.mustTry.map((w) => (
                      <li
                        key={w}
                        className="flex items-center gap-2 text-sm text-[#1a0505]"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        <span className="w-1 h-1 rounded-full bg-[#731515] shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Description */}
              <div>
                <p
                  className="text-base md:text-lg text-[#7a4a4a] font-light leading-relaxed"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {region.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── WINERIES WE VISITED ── */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-right" style={{ top: '5%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14" />

            <div className="mb-10">
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">OUR VISITS</div>
              <h2
                className="text-[clamp(2rem,5vw,3.5rem)] font-light text-[#1a0505] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Wineries We Visited
              </h2>
              {!region.wineries && (
                <p
                  className="mt-4 text-sm text-[#7a4a4a] font-light italic"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Winery profiles coming soon — we&apos;re curating each story carefully.
                </p>
              )}
            </div>

            {region.wineries && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {region.wineries.map((name, i) => (
                  <WineryCard key={name} name={name} index={i} />
                ))}
                {region.wineriesNote && <MoreCard />}
              </div>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
