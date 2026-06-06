'use client';

import { memo, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { type EventData, type EventStatus } from '@/lib/events';
import { useTranslations } from 'next-intl';

const StatusBadge = memo(function StatusBadge({ status, slug }: { status: EventStatus; slug: string }) {
  const t = useTranslations('common');
  if (status === 'open') {
    return (
      <Link href={`/checkout/${slug}`} className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-3 min-h-[44px] inline-flex items-center bg-[#731515] text-[#F5EEE6] border border-[#731515] hover:bg-[#aa4848] hover:border-[#aa4848] transition-all duration-300 whitespace-nowrap">
        {t('buyTickets')}
      </Link>
    );
  }
  if (status === 'soldout') {
    return (
      <span className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 bg-[#3a3a3a] text-white whitespace-nowrap">
        {t('soldOut')}
      </span>
    );
  }
  if (status === 'soon') {
    return (
      <span className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 border border-[#ccc] text-[#aaa] whitespace-nowrap">
        {t('comingSoon')}
      </span>
    );
  }
  return (
    <span className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 border border-[#ddd] text-[#bbb] whitespace-nowrap">
      {t('completed')}
    </span>
  );
});

function EventRow({
  event,
  index,
  isLast,
  reducedMotion,
}: { event: EventData; index: number; isLast: boolean; reducedMotion: boolean | null }) {
  const faded = event.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-4 sm:gap-5 md:gap-8 py-5 md:py-7 group">

        {/* Thumbnail */}
        {event.image_url && (
          <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 overflow-hidden border ${faded ? 'border-[#e8d5d5]' : 'border-[#d4b0b0]/40'}`}>
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${faded ? 'opacity-40' : ''}`}
              sizes="(max-width:640px) 64px, (max-width:768px) 80px, 96px"
            />
          </div>
        )}

        {/* Date column */}
        <div className="flex flex-col items-end w-10 sm:w-12 md:w-[72px] shrink-0">
          <span className={`text-[8px] tracking-[0.4em] mb-0.5 ${faded ? 'text-[#ccc]' : 'text-[#731515]'}`}>
            {event.month}
          </span>
          <span
            className={`text-[2rem] sm:text-[2.6rem] md:text-[3.2rem] font-light leading-none transition-colors duration-300 ${
              faded ? 'text-[#ddd]' : 'text-[#1a0505] group-hover:text-[#731515]'
            }`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.day}
          </span>
        </div>

        {/* Vertical line */}
        <div className={`w-px self-stretch shrink-0 ${faded ? 'bg-[#e8d5d5]' : 'bg-[#731515]/18'}`} />

        {/* Event details */}
        <div className="flex-1 min-w-0">
          <div className={`text-[8px] tracking-[0.4em] mb-1.5 ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]/70'}`}>
            {event.type}
          </div>
          <h3
            className={`text-base md:text-lg font-medium leading-snug mb-2 transition-colors duration-300 ${
              faded ? 'text-[#ccc]' : 'text-[#1a0505] group-hover:text-[#731515]'
            } ${event.titleStrikethrough ? 'line-through decoration-[#731515]/60' : ''}`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.title}
          </h3>
          <div className={`flex items-center gap-2 text-xs ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]'}`}>
            <MapPin size={10} className={faded ? 'text-[#ccc] shrink-0' : 'text-[#731515] shrink-0'} />
            <span>{event.location}</span>
          </div>
        </div>

        {/* Status badge — desktop */}
        <div className="shrink-0 self-center hidden sm:block">
          <StatusBadge status={event.status} slug={event.slug} />
        </div>
      </div>

      {/* Mobile badge — indent accounts for optional thumbnail + date column */}
      <div className={`sm:hidden pb-5 ${event.image_url ? 'pl-[calc(64px+1.5rem)]' : 'pl-14'}`}>
        <StatusBadge status={event.status} slug={event.slug} />
      </div>

      {!isLast && <div className={`h-px ${faded ? 'bg-[#e8d5d5]' : 'bg-[#731515]/8'}`} />}
    </motion.div>
  );
}

export default function EventsSection() {
  const reducedMotion = useReducedMotion();
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const [allEvents, setAllEvents] = useState<EventData[]>([]);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((data) => {
        if (data.events?.length) {
          const visible = (data.events as EventData[])
            .filter((e) => !e.titleStrikethrough)
            .slice(0, 3);
          setAllEvents(visible);
        }
      })
      .catch(() => {/* keep static */});
  }, []);

  const visibleEvents = allEvents;

  return (
    <section id="eventi" className="pt-4 pb-12 md:pt-6 md:pb-16 relative overflow-hidden">
      <div className="fog-center" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reducedMotion ? 0 : 0.8 }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">{t('featuredEvents')}</div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {t('events')}
          </h2>
          <p
            className="mt-6 text-lg text-[#7a4a4a] font-light italic"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {t('eventsSubtitle')}
          </p>
        </motion.div>

        <div>
          {visibleEvents.map((event, i) => (
            <EventRow
              key={event.slug}
              event={event}
              index={i}
              isLast={i === visibleEvents.length - 1}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.3 }}
          className="mt-10 flex justify-end"
        >
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#731515] hover:text-[#aa4848] transition-colors duration-300 group"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {tCommon('exploreMore')}
            <span className="group-hover:translate-x-0.5 transition-transform duration-300">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
