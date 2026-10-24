'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { SiteNav } from '@/components/ui/SiteNav';
import { Chapter } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import PartnerLogo from '@/components/PartnerLogo';
import EstatesGrid from '@/components/EstatesGrid';
import { PARTNERS, type Partner } from '@/lib/partners';

type TabKey = 'all' | 'estate';

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
        <div className="relative aspect-square bg-white border border-[var(--color-rule-paper)] rounded-lg overflow-hidden">
          <PartnerLogo name={partner.name} logo={partner.logo} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        </div>
        <div className="mt-4 px-0.5">
          <h3
            className="text-base font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors duration-300 mb-2"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {partner.name}
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[8px] tracking-[0.25em] px-3 py-1.5 border border-[var(--color-accent)]/25 text-[var(--color-accent)] rounded-full whitespace-nowrap">
            <span className="w-1 h-1 rounded-full bg-[var(--color-accent)] inline-block" />
            {t('badge')}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function PartnersPage() {
  const t = useTranslations('partners');
  const tHub = useTranslations('eventsHub');
  const reducedMotion = useReducedMotion();
  const [tab, setTab] = useState<TabKey>('all');

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all',    label: t('filterAll') },
    { key: 'estate', label: t('filterEstate') },
  ];

  return (
    <>
      <SiteNav />
      <main className="ds bg-paper text-on-paper">

        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Partner']} accent={[0, 0]} />
        </Section>

        <section className="relative">
          <div className="mx-auto max-w-[1180px] px-gutter md:px-10">
            <p className="max-w-[62ch] text-lead text-on-paper-muted">{t('subtitle')}</p>
            <div className="mt-12" />

            {/* Tab toggle */}
            <div className="flex flex-wrap gap-3 mb-14">
              {TABS.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={`min-h-[48px] px-5 text-[13px] font-medium rounded-full border transition-colors duration-300 ${
                    tab === tb.key
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'border-[var(--color-rule-paper)] text-[var(--color-on-paper-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            {tab === 'all' ? (
              /* Grid — all partners, no category distinction */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10">
                {PARTNERS.map((partner, i) => (
                  <PartnerCard key={partner.slug} partner={partner} index={i} reducedMotion={reducedMotion} />
                ))}
              </div>
            ) : (
              /* Our Estate — same content/layout as /wineries, same component */
              <div className="-mx-6 lg:-mx-10 px-6 lg:px-10 py-12 bg-[#381212] text-[#F5EEE6] rounded-2xl">
                <div className="mb-10 max-w-2xl">
                  <div className="text-[10px] tracking-[0.5em] text-[#5a1010] mb-3">{tHub('estatesHeading').toUpperCase()}</div>
                  <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-light leading-none mb-4" style={{ fontFamily: 'var(--font-syne)' }}>
                    {tHub('estatesHeading')}
                  </h2>
                  <p className="text-[#C4B5A0] text-sm leading-relaxed" style={{ fontFamily: 'var(--font-geist)' }}>
                    {tHub('estatesIntro')}
                  </p>
                </div>
                <EstatesGrid />
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
