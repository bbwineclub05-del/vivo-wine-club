'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PartnerLogo from '@/components/PartnerLogo';
import { PARTNERS, type Partner, type PartnerCategory } from '@/lib/partners';

type FilterKey = 'all' | PartnerCategory;

function PartnerCard({ partner, index, reducedMotion }: { partner: Partner; index: number; reducedMotion: boolean | null }) {
  const t = useTranslations('partners');

  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/partners/${partner.slug}`} className="group flex flex-col">
        <div className="relative aspect-square bg-white border border-[#e8d5d5] rounded-lg overflow-hidden">
          <PartnerLogo name={partner.name} logo={partner.logo} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        </div>
        <div className="mt-4 px-0.5">
          <div className="text-[9px] tracking-[0.25em] text-[#9a6060] mb-1.5">
            {partner.category === 'cantina' ? t('categoryCantina') : t('categoryLocation')}
          </div>
          <h3
            className="text-base font-medium text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300 mb-2"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {partner.name}
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[8px] tracking-[0.25em] px-3 py-1.5 border border-[#731515]/25 text-[#731515] rounded-full whitespace-nowrap">
            <span className="w-1 h-1 rounded-full bg-[#731515] inline-block" />
            {t('badge')}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function PartnersPage() {
  const t = useTranslations('partners');
  const reducedMotion = useReducedMotion();
  const [filter, setFilter] = useState<FilterKey>('all');

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: t('filterAll') },
    { key: 'cantina',  label: t('filterCantina') },
    { key: 'location', label: t('filterLocation') },
  ];

  const filtered = filter === 'all' ? PARTNERS : PARTNERS.filter((p) => p.category === filter);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <motion.div
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: reducedMotion ? 0 : 0.8 }}
              className="mb-14"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">{t('label')}</div>
              <h1
                className="text-[clamp(2.5rem,7vw,5.5rem)] font-light text-[#1a0505] leading-none section-title mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('heading')}
              </h1>
              <p className="text-lg text-[#7a4a4a] font-light italic max-w-md" style={{ fontFamily: 'var(--font-nunito)' }}>
                {t('subtitle')}
              </p>
            </motion.div>

            {/* Filter toggle */}
            <div className="flex flex-wrap gap-3 mb-14">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-[10px] tracking-[0.25em] px-5 py-2.5 rounded-lg border transition-colors duration-300 ${
                    filter === f.key
                      ? 'bg-[#731515] text-white border-[#731515]'
                      : 'border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10">
              {filtered.map((partner, i) => (
                <PartnerCard key={partner.slug} partner={partner} index={i} reducedMotion={reducedMotion} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
