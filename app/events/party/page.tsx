'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WinePartyGallery from '@/components/WinePartyGallery';

export default function WinePartyGalleryPage() {
  const t       = useTranslations('wineParty');
  const tCommon = useTranslations('common');

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-[#0a0204] text-[#F5EEE6]">
        <div className="max-w-7xl mx-auto px-8 md:px-10 py-12">
          <Link
            href="/events#party"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors duration-300 group mb-10"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            {tCommon('back')}
          </Link>

          <div className="mb-10">
            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">VIVO WINE CLUB</div>
            <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-light leading-none mb-2" style={{ fontFamily: 'var(--font-syne)' }}>
              Wine Party
            </h1>
            <p className="text-lg text-[#C4B5A0] font-light italic" style={{ fontFamily: 'var(--font-nunito)' }}>
              {t('heroTagline')}
            </p>
          </div>

          <WinePartyGallery />
        </div>
      </main>
      <Footer />
    </>
  );
}
