import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getWineryBySlug, WINERIES } from '@/lib/wineries';

export function generateStaticParams() {
  return WINERIES.map((w) => ({ slug: w.slug }));
}

/* ── Bottle icon fallback ── */
function BottleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8" />
      <path d="M9 2v2.5c0 .8-.4 1.5-1 2L6 8.5C5.4 9 5 9.7 5 10.5V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9.5c0-.8-.4-1.5-1-2L16 6.5c-.6-.5-1-1.2-1-2V2" />
    </svg>
  );
}

/* ── Placeholder photo cell ── */
function PhotoPlaceholder({ index }: { index: number }) {
  return (
    <div className="aspect-square border border-dashed border-[#e8d5d5] bg-[#fdf8f8] flex flex-col items-center justify-center gap-3 text-[#9a6060]/50">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span className="text-[9px] tracking-[0.3em]">PHOTO {String(index + 1).padStart(2, '0')}</span>
    </div>
  );
}

/* ── Page ── */
export default async function WineryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const winery = getWineryBySlug(slug);
  if (!winery) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <Link
              href={`/wine-regions/${winery.regionSlug}`}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-10 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              {winery.region.toUpperCase()}
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">

              {/* Text side */}
              <div className="flex-1">
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">WINERY</div>
                <h1
                  className="text-[clamp(2.4rem,7vw,5.5rem)] font-light text-[#1a0505] leading-none section-title mb-5"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {winery.name}
                </h1>

                <div className="flex items-center gap-2 text-sm text-[#7a4a4a] mb-4">
                  <MapPin size={13} className="text-[#731515] shrink-0" />
                  <span>{winery.region}, {winery.country}</span>
                </div>

                {winery.classification && (
                  <div className="text-[10px] tracking-[0.2em] text-[#7a4a4a]/70 mb-6"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    {winery.classification}
                  </div>
                )}

                <span className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] px-4 py-2 border border-[#731515]/30 text-[#731515]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#731515] inline-block" />
                  VISITED BY VIVO WINE CLUB
                </span>
              </div>

              {/* Logo side */}
              {winery.logo && (
                <div className="shrink-0 w-full lg:w-56 xl:w-64">
                  <div className="relative bg-white border border-[#e8d5d5] p-6 flex items-center justify-center" style={{ height: '180px' }}>
                    <Image
                      src={winery.logo}
                      alt={winery.name}
                      fill
                      className="object-contain p-6"
                      sizes="(max-width: 1024px) 80vw, 256px"
                      priority
                    />
                  </div>
                </div>
              )}

              {/* Fallback icon when no logo */}
              {!winery.logo && (
                <div className="shrink-0 w-full lg:w-56 xl:w-64">
                  <div className="bg-white border border-[#e8d5d5] flex items-center justify-center text-[#731515]/30" style={{ height: '180px' }}>
                    <BottleIcon />
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section className="relative overflow-hidden pb-20 md:pb-24">
          <div className="fog-left" style={{ top: '10%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16" />

            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-12 lg:gap-20 items-start">

              <div>
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">ABOUT</div>
                <h2
                  className="text-2xl font-light text-[#1a0505] leading-snug"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  The Estate
                </h2>
              </div>

              <div className="flex flex-col gap-6">
                {winery.description.map((para, i) => (
                  <p
                    key={i}
                    className="text-base md:text-lg text-[#7a4a4a] font-light leading-relaxed"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {para}
                  </p>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── OUR VISIT ── */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-right" style={{ top: '5%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14" />

            <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">OUR VISIT</div>
                <h2
                  className="text-[clamp(2rem,5vw,3.5rem)] font-light text-[#1a0505] leading-none"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  Gallery
                </h2>
              </div>
              <p
                className="text-sm text-[#7a4a4a]/60 italic pb-1"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Photos and stories coming soon.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <PhotoPlaceholder key={i} index={i} />
              ))}
            </div>

          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
