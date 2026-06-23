'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { type EventData, type EventSection } from '@/lib/events';
import { useTranslations } from 'next-intl';

interface Props {
  section: EventSection;
  /** Tailwind colour token for the accent (e.g. '#731515' or '#C9A84C') */
  accentColor?: string;
  /** Tailwind colour token for the date number hover */
  dateHoverColor?: string;
  /** Text colour for labels and location */
  mutedColor?: string;
  /** Background for ticket button */
  btnBg?: string;
  /** Text colour for ticket button */
  btnText?: string;
  /** Max number of events to display */
  limit?: number;
}

/** Stateless event row used inside ExperienceUpcoming */
function UpcomingRow({
  event,
  index,
  isLast,
  accentColor,
  mutedColor,
  btnBg,
  btnText,
}: {
  event: EventData;
  index: number;
  isLast: boolean;
  accentColor: string;
  mutedColor: string;
  btnBg: string;
  btnText: string;
}) {
  const tCommon = useTranslations('common');
  const tEvents = useTranslations('events');
  return (
    <motion.div
      key={event.slug}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-6 md:gap-10 py-6 group">
        {/* Date */}
        <div className="flex flex-col items-end w-14 shrink-0">
          <span className="text-[8px] tracking-[0.4em] mb-0.5" style={{ color: accentColor }}>
            {event.month}
          </span>
          <span
            className="text-[2.8rem] font-light leading-none transition-colors duration-300 group-hover:opacity-80"
            style={{ fontFamily: 'var(--font-syne)', color: mutedColor === 'light' ? '#F5EEE6' : '#1a0505' }}
          >
            {event.day}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch shrink-0" style={{ background: `${accentColor}33` }} />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-base md:text-lg font-medium mb-1 transition-colors duration-300 group-hover:opacity-80"
            style={{
              fontFamily: 'var(--font-syne)',
              color: mutedColor === 'light' ? '#F5EEE6' : '#1a0505',
            }}
          >
            {event.title}
          </h3>
          <div className="flex items-center gap-2 text-xs" style={{ color: mutedColor === 'light' ? '#C4B5A0' : '#7a4a4a' }}>
            <MapPin size={10} style={{ color: accentColor }} className="shrink-0" />
            <span>{event.locationFull || event.location}</span>
            {event.price > 0 && (
              <>
                <span style={{ color: accentColor, opacity: 0.4 }} className="mx-0.5">·</span>
                <span>€{event.price}</span>
              </>
            )}
          </div>
        </div>

        {/* CTA */}
        {event.status === 'open' && (
          <Link
            href={event.isListOnly ? `/events/${event.slug}#guest-form` : `/checkout/${event.slug}`}
            className="shrink-0 hidden sm:inline-flex text-[9px] tracking-[0.28em] px-5 py-2.5 transition-all duration-300 hover:opacity-80 rounded-lg"
            style={{ background: btnBg, color: btnText }}
          >
            {event.isListOnly ? tEvents('joinTheList') : event.price > 0 ? tCommon('buyTickets') : tCommon('register')}
          </Link>
        )}
        {event.status === 'soldout' && (
          <span className="shrink-0 hidden sm:inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#3a3a3a] text-white rounded-lg">
            {tCommon('soldOut')}
          </span>
        )}
        {event.status === 'soon' && (
          <span className="shrink-0 hidden sm:inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 border border-white/20 text-white/50 rounded-lg">
            {tCommon('comingSoon')}
          </span>
        )}
      </div>

      {/* Mobile CTA */}
      {event.status === 'open' && (
        <div className="sm:hidden pb-4 pl-20">
          <Link
            href={event.isListOnly ? `/events/${event.slug}#guest-form` : `/checkout/${event.slug}`}
            className="text-[9px] tracking-[0.28em] px-5 py-3 min-h-[44px] inline-flex items-center transition-all duration-300 hover:opacity-80 rounded-lg"
            style={{ background: btnBg, color: btnText }}
          >
            {event.isListOnly ? tEvents('joinTheList') : event.price > 0 ? tCommon('buyTickets') : tCommon('register')}
          </Link>
        </div>
      )}

      {!isLast && <div className="h-px" style={{ background: `${accentColor}1a` }} />}
    </motion.div>
  );
}

export default function ExperienceUpcoming({
  section,
  accentColor = '#731515',
  mutedColor = 'light',
  btnBg = '#731515',
  btnText = '#F5EEE6',
  limit,
}: Props) {
  const tCommon = useTranslations('common');
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    fetch(`/api/events?section=${section}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.events) {
          setEvents((data.events as EventData[]).filter((e) => e.status !== 'completed'));
        }
      })
      .catch(() => {/* keep static */});
  }, [section]);

  if (events.length === 0) {
    return (
      <p className="text-sm italic opacity-40" style={{ fontFamily: 'var(--font-nunito)' }}>
        {tCommon('noUpcomingEvents')}
      </p>
    );
  }

  const visible = limit ? events.slice(0, limit) : events;

  return (
    <div className="flex flex-col">
      {visible.map((event, i) => (
        <UpcomingRow
          key={event.slug}
          event={event}
          index={i}
          isLast={i === visible.length - 1}
          accentColor={accentColor}
          mutedColor={mutedColor}
          btnBg={btnBg}
          btnText={btnText}
        />
      ))}
    </div>
  );
}
