'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

const CHOICES = [
  {
    href:    '/collaborate/companies',
    eyebrow: 'companiesEyebrow',
    title:   'companiesTitle',
    desc:    'companiesDesc',
    cta:     'companiesCta',
    bg:      'bg-[#5a1010]',
  },
  {
    href:    '/collaborate/ambassador',
    eyebrow: 'ambassadorEyebrow',
    title:   'ambassadorTitle',
    desc:    'ambassadorDesc',
    cta:     'ambassadorCta',
    bg:      'bg-[#731515]',
  },
] as const;

export default function CollaboratePage() {
  const t = useTranslations('collaborate');

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-14 max-w-3xl"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">
                {t('getInTouch')}
              </div>
              <h1
                className="text-[clamp(2.2rem,5.5vw,4.5rem)] font-light text-[#1a0505] leading-tight mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('heading')}
              </h1>
              <p
                className="text-base text-[#7a4a4a] font-light leading-relaxed max-w-xl"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('choiceSubtitle')}
              </p>
            </motion.div>

            {/* Choice cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {CHOICES.map((c, i) => (
                <motion.div
                  key={c.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.15 + i * 0.1 }}
                >
                  <Link
                    href={c.href}
                    className={`group ${c.bg} text-[#F5EEE6] rounded-lg p-8 md:p-10 min-h-[280px] h-full flex flex-col justify-between shadow-[0_10px_30px_-18px_rgba(26,5,5,0.6)] hover:bg-[#9b2323] hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(26,5,5,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#731515] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F5E6E6] transition-all duration-300`}
                  >
                    <div>
                      <div className="text-[10px] tracking-[0.5em] text-[#F5EEE6]/60 mb-5">{t(c.eyebrow)}</div>
                      <h2
                        className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-light leading-tight mb-4"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {t(c.title)}
                      </h2>
                      <p
                        className="text-base md:text-lg text-[#F5EEE6]/80 font-light leading-relaxed"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {t(c.desc)}
                      </p>
                    </div>
                    <span className="mt-10 inline-flex items-center gap-3 text-[11px] tracking-[0.35em]">
                      {t(c.cta)}
                      <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
