'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EstatesGrid from '@/components/EstatesGrid';

function WineriesContent() {
  const t = useTranslations('eventsHub');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get('region') ?? undefined;

  return (
    <div className="max-w-7xl mx-auto px-8 md:px-10 py-12">
      <Link
        href="/events#estates"
        className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors duration-300 group mb-10"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
        {tCommon('back')}
      </Link>

      <div className="mb-10 max-w-2xl">
        <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">{t('estatesHeading').toUpperCase()}</div>
        <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-light leading-none mb-4" style={{ fontFamily: 'var(--font-syne)' }}>
          {t('estatesHeading')}
        </h1>
        <p className="text-[#C4B5A0] text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
          {t('estatesIntro')}
        </p>
      </div>

      <EstatesGrid initialRegion={initialRegion} />
    </div>
  );
}

export default function WineriesIndexPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-[#162549] text-[#F5EEE6]">
        <Suspense fallback={null}>
          <WineriesContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
