'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import EventStatusBadge from '@/components/EventStatusBadge';
import WinePartyGallery from '@/components/WinePartyGallery';
import WineLoungeGallery from '@/components/WineLoungeGallery';
import EstatesGrid from '@/components/EstatesGrid';
import {
  getEventDisplayStatus,
  type EventData,
  type EventSection,
} from '@/lib/events';

/* ─────────────────────────────────────────────
   Shared bits
───────────────────────────────────────────── */
const PILL_KEYS = ['pill1', 'pill2', 'pill3'] as const;

/* ─────────────────────────────────────────────
   1. Hero — unified, with quick-jump chips
───────────────────────────────────────────── */
function HubHero() {
  const t    = useTranslations('events');
  const tNav = useTranslations('nav');

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] md:h-[460px]">
      <Image
        src="/events/wine-party8.jpg"
        alt="Events — Vivo Wine Club"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#731515]/65" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">{t('calendarLabel')}</div>
        <h1
          className="text-[clamp(2.2rem,6vw,4.5rem)] font-light text-white leading-tight"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {t('heading')}
        </h1>
        <p
          className="mt-4 max-w-xl text-sm md:text-base text-white/75 font-light italic leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {t('subtitle')}
        </p>

        {/* Quick-jump chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {(['party', 'lounge', 'visits'] as const).map((key) => (
            <a
              key={key}
              href={`#${key === 'visits' ? 'visits' : key}`}
              className="px-5 py-2.5 border border-white/30 text-white text-[10px] tracking-[0.3em] rounded-full hover:bg-white/10 hover:border-white/60 transition-all duration-300"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {tNav(key)}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   2. Upcoming — aggregated, filterable
───────────────────────────────────────────── */
function EventRow({ event, isLast }: { event: EventData; isLast: boolean }) {
  const today       = new Date().toISOString().slice(0, 10);
  const displayStatus = getEventDisplayStatus(event, today);
  const faded       = displayStatus === 'past' || displayStatus === 'closed';
  const detailHref  = `/events/${event.slug}`;

  return (
    <div>
      <div className="flex items-center gap-4 sm:gap-5 md:gap-8 py-6 sm:py-8 md:py-9 group">
        {event.image_url && (
          <Link href={detailHref} className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden border border-[#d4b0b0]/40 rounded-lg">
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${faded ? 'opacity-40' : ''}`}
              sizes="(max-width:640px) 64px, 80px"
            />
          </Link>
        )}

        <div className="flex flex-col items-end w-10 sm:w-12 md:w-[64px] shrink-0">
          <span className={`text-[8px] tracking-[0.4em] mb-0.5 ${faded ? 'text-[#ccc]' : 'text-[#731515]'}`}>
            {event.month}
          </span>
          <span
            className={`text-[1.9rem] sm:text-[2.3rem] font-light leading-none ${faded ? 'text-[#ddd]' : 'text-[#1a0505]'}`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.day}
          </span>
        </div>

        <div className={`w-px self-stretch shrink-0 ${faded ? 'bg-[#e8d5d5]' : 'bg-[#731515]/15'}`} />

        <div className="flex-1 min-w-0">
          <div className={`text-[8px] tracking-[0.35em] mb-2 ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]/70'}`}>
            {event.type}
          </div>
          <Link
            href={detailHref}
            className={`block text-base md:text-lg font-medium leading-snug mb-2 ${
              faded ? 'text-[#ccc]' : 'text-[#1a0505] hover:text-[#731515] transition-colors duration-300'
            } ${event.titleStrikethrough ? 'line-through decoration-[#731515]/60' : ''}`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.title}
          </Link>
          <div className={`flex items-center gap-2 text-xs ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]'}`}>
            <MapPin size={10} className={faded ? 'text-[#ccc] shrink-0' : 'text-[#731515] shrink-0'} />
            <span>{event.locationFull}</span>
          </div>
          <div className="mt-3 sm:hidden">
            <EventStatusBadge displayStatus={displayStatus} slug={event.slug} isListOnly={event.isListOnly} />
          </div>
        </div>

        <div className="shrink-0 self-center hidden sm:block">
          <EventStatusBadge displayStatus={displayStatus} slug={event.slug} isListOnly={event.isListOnly} />
        </div>
      </div>
      {!isLast && <div className={`h-px ${faded ? 'bg-[#ede0e0]' : 'bg-[#731515]/8'}`} />}
    </div>
  );
}

function UpcomingSection({ events }: { events: EventData[] }) {
  const t       = useTranslations('eventsHub');
  const tCommon = useTranslations('common');
  const [filter, setFilter] = useState<'all' | EventSection>('all');

  const hasGeneral = useMemo(() => events.some((e) => (e.section ?? 'general') === 'general'), [events]);

  const filters: { key: 'all' | EventSection; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'wine_party', label: 'Wine Party' },
    { key: 'wine_lounge', label: 'Wine Lounge' },
    { key: 'winery_visit', label: 'Winery Visits' },
    ...(hasGeneral ? [{ key: 'general' as const, label: t('filterGeneral') }] : []),
  ];

  const visible = filter === 'all' ? events : events.filter((e) => (e.section ?? 'general') === filter);

  return (
    <section id="prossimi-eventi" className="relative overflow-hidden py-16 md:py-20 scroll-mt-16">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-8"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{tCommon('upcoming')}</div>
          <h2
            className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-none"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {t('upcomingHeading')}
          </h2>
        </motion.div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-[9px] tracking-[0.25em] rounded-full border transition-all duration-200 ${
                filter === f.key
                  ? 'bg-[#731515] border-[#731515] text-white'
                  : 'border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {f.label.toUpperCase()}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm italic text-[#7a4a4a]/50 py-10" style={{ fontFamily: 'var(--font-nunito)' }}>
            {tCommon('noUpcomingEvents')}
          </p>
        ) : (
          <div>
            {visible.map((event, i) => (
              <EventRow key={event.slug} event={event} isLast={i === visible.length - 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   3. Wine Party
───────────────────────────────────────────── */
function WinePartySection() {
  const t = useTranslations('wineParty');

  return (
    <section id="party" className="bg-[#0a0204] text-[#F5EEE6] scroll-mt-16">
      <div className="pt-16 md:pt-20 pb-8 max-w-4xl mx-auto px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">VIVO WINE CLUB</div>
          <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-light leading-none mb-1" style={{ fontFamily: 'var(--font-syne)' }}>
            Wine Party
          </h2>
          <p className="text-lg text-[#C4B5A0] font-light italic mb-8" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t('heroTagline')}
          </p>

          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-5">{t('theConcept')}</div>
          <p className="text-xl md:text-2xl text-[#C4B5A0] font-light leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
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
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="px-6 py-3 border border-[#731515]/40 text-[#731515] text-[11px] tracking-[0.35em] rounded-full"
            >
              {t(key)}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="pt-6 pb-14 bg-[#090103]">
        <div className="max-w-7xl mx-auto px-8 md:px-10">
          <WinePartyGallery limit={8} />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   4. Wine Lounge
───────────────────────────────────────────── */
function WineLoungeSection() {
  const t = useTranslations('wineLounge');

  return (
    <section id="lounge" className="bg-[#3d1010] text-[#F5EEE6] scroll-mt-16">
      <div className="py-16 md:py-20 max-w-4xl mx-auto px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">VIVO WINE CLUB</div>
          <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-light leading-none mb-1" style={{ fontFamily: 'var(--font-syne)' }}>
            Wine Lounge
          </h2>
          <p className="text-lg text-[#C4B5A0] font-light italic mb-8" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t('heroTagline')}
          </p>

          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-5">{t('theConcept')}</div>
          <p className="text-xl md:text-2xl text-[#C4B5A0] font-light leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
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
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="px-6 py-3 border border-white/20 text-white/60 text-[11px] tracking-[0.35em] rounded-full"
            >
              {t(key)}
            </motion.div>
          ))}
        </div>

        <div className="mt-8">
          <WineLoungeGallery limit={6} />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   5. Winery Visits + Estates (credibility block)
───────────────────────────────────────────── */
function WineryVisitsSection() {
  const t = useTranslations('wineryVisits');

  return (
    <section id="visits" className="bg-[#1A2E5C] text-[#F5EEE6] scroll-mt-16">
      <div className="py-16 md:py-20 max-w-4xl mx-auto px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">VIVO WINE CLUB</div>
          <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-light leading-none mb-1" style={{ fontFamily: 'var(--font-syne)' }}>
            Winery Visits
          </h2>
          <p className="text-lg text-[#C4B5A0] font-light italic mb-8" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t('heroTagline')}
          </p>

          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-5">{t('theConcept')}</div>
          <p className="text-xl md:text-2xl text-[#C4B5A0] font-light leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
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
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="px-6 py-3 border border-[#C9A84C]/40 text-[#C9A84C] text-[11px] tracking-[0.35em] rounded-full"
            >
              {t(key)}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EstatesSection() {
  const t = useTranslations('eventsHub');

  return (
    <section id="estates" className="bg-[#162549] text-[#F5EEE6] py-16 md:py-20 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-8 md:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-10 max-w-2xl">
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">{t('estatesHeading').toUpperCase()}</div>
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-light leading-none mb-4" style={{ fontFamily: 'var(--font-syne)' }}>
            {t('estatesHeading')}
          </h2>
          <p className="text-[#C4B5A0] text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t('estatesIntro')}
          </p>
        </motion.div>

        <EstatesGrid limit={8} />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   6. Closing CTA
───────────────────────────────────────────── */
function ClosingSection() {
  const tParty  = useTranslations('wineParty');
  const tCommon = useTranslations('common');

  return (
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
          {tParty('dontMissNext')}
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
          {tCommon('becomeAMember')}
        </motion.a>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Page assembly
───────────────────────────────────────────── */
export default function EventsHub({ events }: { events: EventData[] }) {
  return (
    <>
      <HubHero />
      <UpcomingSection events={events} />
      <WinePartySection />
      <WineLoungeSection />
      <WineryVisitsSection />
      <EstatesSection />
      <ClosingSection />
    </>
  );
}
