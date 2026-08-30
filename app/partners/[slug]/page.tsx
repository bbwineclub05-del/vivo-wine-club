import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PartnerLogo from '@/components/PartnerLogo';
import PartnerGallery from '@/components/PartnerGallery';
import { getPartnerBySlug, PARTNERS, localized } from '@/lib/partners';

export function generateStaticParams() {
  return PARTNERS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const partner = getPartnerBySlug(slug);
  if (!partner) return {};
  const locale = await getLocale();
  return {
    title: `${partner.name} — Vivo Wine Club`,
    description: localized(partner.shortDesc, locale),
  };
}

export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const partner = getPartnerBySlug(slug);
  if (!partner) notFound();

  const t      = await getTranslations('partners');
  const locale = await getLocale();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* Back link */}
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
          <Link
            href="/partners"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            {t('label')}
          </Link>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">

              {/* Text side */}
              <div className="flex-1">
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">
                  {partner.category === 'cantina' ? t('categoryCantina') : t('categoryLocation')}
                </div>
                <h1
                  className="text-[clamp(2.4rem,7vw,5.5rem)] font-light text-[#1a0505] leading-none section-title mb-5"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {partner.name}
                </h1>

                {partner.subtitle && (
                  <div className="text-[10px] tracking-[0.2em] text-[#7a4a4a]/70 mb-6"
                    style={{ fontFamily: 'var(--font-nunito)' }}>
                    {localized(partner.subtitle, locale)}
                  </div>
                )}

                {partner.address && (
                  <div className="flex items-center gap-2 text-sm text-[#7a4a4a] mb-2">
                    <MapPin size={13} className="text-[#731515] shrink-0" />
                    <span>{partner.address}</span>
                  </div>
                )}

                {partner.phone && (
                  <a href={`tel:${partner.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-sm text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-2 w-fit">
                    <Phone size={13} className="text-[#731515] shrink-0" />
                    <span>{partner.phone}</span>
                  </a>
                )}

                {partner.email && (
                  <a href={`mailto:${partner.email}`} className="flex items-center gap-2 text-sm text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-4 w-fit">
                    <Mail size={13} className="text-[#731515] shrink-0" />
                    <span>{partner.email}</span>
                  </a>
                )}

                <span className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] px-4 py-2 border border-[#731515]/30 text-[#731515] rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#731515] inline-block" />
                  {t('badge')}
                </span>

                {partner.externalUrl && (
                  <div className="mt-6">
                    <a
                      href={partner.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-[#731515] hover:text-[#aa4848] transition-colors duration-300 group/link"
                    >
                      <ExternalLink size={12} className="group-hover/link:translate-x-0.5 transition-transform duration-300" />
                      {t('visitLink')}
                    </a>
                  </div>
                )}
              </div>

              {/* Logo side */}
              <div className="shrink-0 w-full lg:w-56 xl:w-64">
                <div className="relative bg-white border border-[#e8d5d5] p-6 flex items-center justify-center rounded-lg" style={{ height: '180px' }}>
                  <PartnerLogo name={partner.name} logo={partner.logo} sizes="(max-width: 1024px) 80vw, 256px" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="relative overflow-hidden pb-20 md:pb-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16" />
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 lg:gap-20 items-start">
              <div>
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('aboutLabel')}</div>
              </div>
              <p
                className="text-lg md:text-xl text-[#3a1a1a] font-light leading-relaxed max-w-2xl"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {localized(partner.shortDesc, locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Quote — hidden until partner.quote is populated (see lib/partners.ts) */}
        {partner.quote && (
          <section className="relative overflow-hidden pb-20 md:pb-24">
            <div className="max-w-5xl mx-auto px-6 lg:px-10">
              <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16" />

              <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-12 lg:gap-20 items-start">
                <div>
                  <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('quoteLabel')}</div>
                </div>

                <div className="bg-[#faf5f4] border-l-2 border-[#6c191e] px-8 py-8 md:px-10 md:py-10">
                  <div
                    className="text-[3rem] leading-none text-[#c99aa0] mb-2"
                    style={{ fontFamily: 'var(--font-syne)' }}
                    aria-hidden="true"
                  >
                    &ldquo;
                  </div>
                  <p
                    className="text-lg md:text-xl text-[#250719] font-light italic leading-relaxed"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {localized(partner.quote, locale)}
                  </p>
                  {partner.quoteAuthor && (
                    <div className="mt-5 text-[11px] tracking-[0.2em] text-[#7a4a4a]/70">
                      — {partner.quoteAuthor}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Gallery — hidden until partner photos are available */}
        <PartnerGallery slug={partner.slug} name={partner.name} />

      </main>
      <Footer />
    </>
  );
}
