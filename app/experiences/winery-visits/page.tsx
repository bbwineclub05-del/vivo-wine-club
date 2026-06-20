'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowLeft, MapPin, CalendarDays } from 'lucide-react';
import ExperienceUpcoming from '@/components/ExperienceUpcoming';
import { WINERIES } from '@/lib/wineries';
import { useTranslations } from 'next-intl';

interface PastVisitEvent {
  slug: string;
  title: string;
  location: string;
  locationFull: string;
  image_url: string | null;
  day: string;
  month: string;
  year: string;
}

const PILL_KEYS = ['pill1', 'pill2', 'pill3'] as const;

export default function WineryVisitsPage() {
  const t = useTranslations('wineryVisits');
  const [pastVisits, setPastVisits] = useState<PastVisitEvent[]>([]);

  useEffect(() => {
    fetch('/api/events?section=winery_visit&past=true')
      .then(r => r.json())
      .then(j => {
        if (Array.isArray(j.events)) {
          setPastVisits(j.events as PastVisitEvent[]);
        }
      })
      .catch(() => {/* fall through — static WINERIES will show */});
  }, []);
  return (
    <div className="bg-[#1A2E5C] min-h-screen text-[#F5EEE6]">

      {/* ── 1. HERO ── */}
      <section className="relative h-screen flex flex-col justify-end overflow-hidden">
        <Image
          src="/events/Winery visits/wv5.jpg"
          alt="Wine Visits"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="absolute top-[130px] left-8 z-10"
        >
          <Link
            href="/#esperienze"
            className="flex items-center gap-2 text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors duration-300 text-[10px] tracking-[0.35em]"
          >
            <ArrowLeft size={13} />
            {t('back')}
          </Link>
        </motion.div>

        <div className="relative z-10 px-8 md:px-16 pb-14 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-[10px] tracking-[0.55em] text-[#C9A84C] mb-4"
          >
            VIVO WINE CLUB · EXPERIENCE
          </motion.div>

          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.5rem,9vw,8rem)] font-light leading-none"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Wine Visits
            </motion.h1>
          </div>

          <div className="overflow-hidden mt-3">
            <motion.p
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-xl md:text-2xl text-[#C4B5A0] font-light italic"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('heroTagline')}
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
        >
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={18} className="text-[#731515]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── 2. UPCOMING VISITS ── */}
      <section className="py-16 md:py-22 bg-[#101D3A]">
        <div className="max-w-4xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-10"
          >
            <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">{t('upcoming')}</div>
            <h2
              className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-none"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {t('upcomingVisits')}
            </h2>
          </motion.div>

          <ExperienceUpcoming
            section="winery_visit"
            accentColor="#C9A84C"
            mutedColor="light"
            btnBg="#731515"
            btnText="#F5EEE6"
            limit={3}
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 pt-8 border-t border-[#C9A84C]/15"
          >
            <Link
              href="/events"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.35em] text-[#C9A84C] hover:text-[#F5EEE6] transition-colors duration-300"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('exploreMoreEvents')}
              <span className="text-base leading-none">→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 3. CONCEPT ── */}
      <section className="py-16 md:py-22 bg-[#162549]">
        <div className="max-w-4xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-5">{t('theConcept')}</div>
            <p
              className="text-xl md:text-2xl text-[#C4B5A0] font-light leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('conceptBody')}
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-4 mt-10">
            {PILL_KEYS.map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="px-6 py-3 border border-[#731515]/40 text-[#731515] text-[11px] tracking-[0.35em] rounded-full"
              >
                {t(key)}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PAST VISITS ── */}
      <section className="py-16 md:py-22 bg-[#162549]">
        <div className="max-w-7xl mx-auto px-8 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-10"
          >
            <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">{t('theEstates')}</div>
            <h2
              className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-none"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {t('pastVisits')}
            </h2>
          </motion.div>

          {/* DB past events — shown when available (alongside the static estates below) */}
          {pastVisits.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
                {pastVisits.map((visit, i) => (
                  <motion.div
                    key={visit.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ duration: 0.55, delay: (i % 8) * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={`/events/${visit.slug}`}
                      className="group flex flex-col bg-[#1A2E5C] border border-[#C9A84C]/20 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#C9A84C]/50 transition-all duration-300"
                    >
                      {/* Image area */}
                      <div className="relative h-28 bg-[#101D3A] overflow-hidden">
                        {visit.image_url ? (
                          <Image
                            src={visit.image_url}
                            alt={visit.title}
                            fill
                            className="object-cover opacity-70 group-hover:opacity-85 transition-opacity duration-300"
                            sizes="(max-width: 768px) 45vw, 200px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[#C9A84C]/40 text-3xl font-light"
                            style={{ fontFamily: 'var(--font-syne)' }}
                          >
                            {visit.title.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2E5C]/60 to-transparent" />
                      </div>

                      {/* Info area */}
                      <div className="flex flex-col gap-1 px-4 py-3">
                        <p
                          className="text-[#F5EEE6] text-sm font-medium leading-tight group-hover:text-[#C9A84C] transition-colors"
                          style={{ fontFamily: 'var(--font-syne)' }}
                        >
                          {visit.title}
                        </p>
                        <p className="flex items-center gap-1 text-[#C4B5A0] text-[11px] tracking-wide">
                          <MapPin size={9} className="text-[#C9A84C] shrink-0" />
                          {visit.location}
                        </p>
                        <p className="flex items-center gap-1 text-[#C9A84C]/70 text-[10px] tracking-wide mt-0.5">
                          <CalendarDays size={9} className="shrink-0" />
                          {visit.day} {visit.month} {visit.year}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Divider between event cards and estates grid */}
              <div className="h-px bg-[#C9A84C]/10 mb-12" />
            </>
          )}

          {/* Static estates — always visible */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {WINERIES.map((winery, i) => (
              <motion.div
                key={winery.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.55, delay: (i % 8) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/wineries/${winery.slug}`}
                  className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#C9A84C]/50 transition-all duration-300"
                >
                  {/* Logo area */}
                  <div className="flex items-center justify-center h-28 px-6 bg-gray-50 group-hover:bg-white transition-colors duration-300">
                    {winery.logo ? (
                      <Image
                        src={winery.logo}
                        alt={winery.name}
                        width={160}
                        height={80}
                        className="w-full h-20 object-contain transition-all duration-300"
                        sizes="(max-width: 768px) 45vw, 200px"
                      />
                    ) : (
                      <div className="text-[#731515] text-2xl font-light tracking-widest opacity-50 group-hover:opacity-80 transition-opacity"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {winery.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info area */}
                  <div className="flex flex-col gap-1 px-4 py-4">
                    <p
                      className="text-[#1a0505] text-sm font-medium leading-tight group-hover:text-[#731515] transition-colors"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {winery.name}
                    </p>
                    <p className="text-[#7a4a4a] text-[11px] tracking-wide">
                      {winery.region} · {winery.country}
                    </p>
                    {winery.classification && (
                      <p className="text-[#731515]/60 text-[10px] tracking-wide mt-0.5 leading-tight line-clamp-1">
                        {winery.classification}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CLOSING ── */}
      <section className="py-10 md:py-14 bg-[#101D3A] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(115,21,21,0.12),transparent_65%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-8 md:px-16 relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light text-[#F5EEE6] leading-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {t('reserveSpot')}
          </motion.h2>
          <motion.a
            href="/membership"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] bg-[#731515] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#9b2323] transition-colors rounded-lg"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {t('becomeAMember')}
          </motion.a>
        </div>
      </section>

    </div>
  );
}
