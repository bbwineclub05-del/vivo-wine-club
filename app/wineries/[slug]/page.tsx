import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getWineryBySlug, WINERIES } from '@/lib/wineries';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import WineryGallery from '@/components/WineryGallery';

// Pre-render the 48 hardcoded winery pages at build time.
// New DB-based wineries are rendered on demand (dynamicParams = true).
export const dynamicParams = true;

export function generateStaticParams() {
  return WINERIES.map((w) => ({ slug: w.slug }));
}

/* ── DB winery shape ── */
interface DbWinery {
  slug:        string;
  name:        string;
  logo_url:    string | null;
  region:      string;
  country:     string;
  description: string;
  visit_date:  string | null;
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

/* ── Shared page shell ── */
function WineryPageShell({
  slug,
  name,
  logo,
  region,
  country,
  classification,
  description,
}: {
  slug:            string;
  name:            string;
  logo:            string | null;
  region:          string;
  country:         string;
  classification?: string;
  description:     string[];
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── Back link ── */}
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
          <Link
            href="/events#estates"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            WINE VISITS
          </Link>
        </div>

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">

              {/* Text side */}
              <div className="flex-1">
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">WINERY</div>
                <h1
                  className="text-[clamp(2.4rem,7vw,5.5rem)] font-light text-[#1a0505] leading-none section-title mb-5"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {name}
                </h1>

                {(region || country) && (
                  <div className="flex items-center gap-2 text-sm text-[#7a4a4a] mb-4">
                    <MapPin size={13} className="text-[#731515] shrink-0" />
                    <span>{[region, country].filter(Boolean).join(', ')}</span>
                  </div>
                )}

                {classification && (
                  <div className="text-[10px] tracking-[0.2em] text-[#7a4a4a]/70 mb-6"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    {classification}
                  </div>
                )}

                <span className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] px-4 py-2 border border-[#731515]/30 text-[#731515] rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#731515] inline-block" />
                  VISITED BY VIVO WINE CLUB
                </span>
              </div>

              {/* Logo side */}
              {logo ? (
                <div className="shrink-0 w-full lg:w-56 xl:w-64">
                  <div className="relative bg-white border border-[#e8d5d5] p-6 flex items-center justify-center rounded-lg" style={{ height: '180px' }}>
                    <Image
                      src={logo}
                      alt={name}
                      fill
                      className="object-contain p-6"
                      sizes="(max-width: 1024px) 80vw, 256px"
                      priority
                    />
                  </div>
                </div>
              ) : (
                <div className="shrink-0 w-full lg:w-56 xl:w-64">
                  <div className="bg-white border border-[#e8d5d5] flex items-center justify-center text-[#731515]/30 rounded-lg" style={{ height: '180px' }}>
                    <BottleIcon />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        {description.length > 0 && description.some(p => p.trim()) && (
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
                  {description.map((para, i) => (
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
        )}

        {/* ── OUR VISIT ── */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-right" style={{ top: '5%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14" />

            <div className="mb-10">
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">OUR VISIT</div>
              <h2
                className="text-[clamp(2rem,5vw,3.5rem)] font-light text-[#1a0505] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Gallery
              </h2>
            </div>

            <WineryGallery slug={slug} />
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

/* ── Page ── */
export default async function WineryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Try the 48 hardcoded wineries first
  const hardcoded = getWineryBySlug(slug);
  if (hardcoded) {
    return (
      <WineryPageShell
        slug={hardcoded.slug}
        name={hardcoded.name}
        logo={hardcoded.logo ?? null}
        region={hardcoded.region}
        country={hardcoded.country}
        classification={hardcoded.classification}
        description={hardcoded.description}
      />
    );
  }

  // 2. Fall back to the DB (auto-created from past winery_visit events)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data } = await db.from('wineries').select('*').eq('slug', slug).maybeSingle();
  if (!data) notFound();

  const winery = data as DbWinery;

  // DB description is a plain string — split on double newlines to get paragraphs
  const paragraphs = winery.description
    ? winery.description.split(/\n\n+/).map((p: string) => p.trim()).filter(Boolean)
    : [];

  return (
    <WineryPageShell
      slug={winery.slug}
      name={winery.name}
      logo={winery.logo_url}
      region={winery.region}
      country={winery.country}
      description={paragraphs}
    />
  );
}
