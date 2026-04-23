'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin } from 'lucide-react';

type EventStatus = 'completed' | 'open' | 'soon';

interface Event {
  id: number;
  title: string;
  type: string;
  month: string;
  day: string;
  location: string;
  price: number;
  status: EventStatus;
}

const EVENTS: Event[] = [
  {
    id: 3,
    title: 'Barolo Vertical Tasting',
    type: 'TASTING',
    month: 'MAY',
    day: '15',
    location: 'Milan, Italy',
    price: 95,
    status: 'open',
  },
  {
    id: 4,
    title: 'Tuscany Winery Tour',
    type: 'TOUR · 3 DAYS',
    month: 'JUN',
    day: '6',
    location: 'Montalcino, Tuscany',
    price: 450,
    status: 'open',
  },
  {
    id: 7,
    title: 'Harvest Experience',
    type: 'EXPERIENCE · 3 DAYS',
    month: 'SEP',
    day: '15',
    location: 'Langhe, Piedmont',
    price: 680,
    status: 'soon',
  },
];

// Memoised — pure display, props never change after mount
const StatusBadge = memo(function StatusBadge({ status }: { status: EventStatus }) {
  if (status === 'open') {
    return (
      <Link href="/events" className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 bg-[#731515] text-[#F5EEE6] border border-[#731515] hover:bg-[#aa4848] hover:border-[#aa4848] transition-all duration-300 whitespace-nowrap">
        BUY TICKETS
      </Link>
    );
  }
  if (status === 'soon') {
    return (
      <span className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 border border-[#ccc] text-[#aaa] whitespace-nowrap">
        COMING SOON
      </span>
    );
  }
  return (
    <span className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 border border-[#ddd] text-[#bbb] whitespace-nowrap">
      COMPLETED
    </span>
  );
});

function EventRow({
  event,
  index,
  isLast,
  reducedMotion,
}: { event: Event; index: number; isLast: boolean; reducedMotion: boolean | null }) {
  const faded = event.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-5 md:gap-8 py-6 md:py-7 group">

        {/* Date column */}
        <div className="flex flex-col items-end w-12 md:w-[72px] shrink-0">
          <span className={`text-[8px] tracking-[0.4em] mb-0.5 ${faded ? 'text-[#ccc]' : 'text-[#731515]'}`}>
            {event.month}
          </span>
          <span
            className={`text-[2.6rem] md:text-[3.2rem] font-light leading-none transition-colors duration-300 ${
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
            }`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.title}
          </h3>
          <div className={`flex items-center gap-2 text-xs ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]'}`}>
            <MapPin size={10} className={faded ? 'text-[#ccc] shrink-0' : 'text-[#731515] shrink-0'} />
            <span>{event.location}</span>
            {!faded && (
              <>
                <span className="text-[#731515]/25 mx-0.5">·</span>
                <span>€{event.price}</span>
              </>
            )}
          </div>
        </div>

        {/* Status badge — desktop */}
        <div className="shrink-0 self-center hidden sm:block">
          <StatusBadge status={event.status} />
        </div>
      </div>

      {/* Mobile badge */}
      <div className="sm:hidden pb-5 pl-[72px]">
        <StatusBadge status={event.status} />
      </div>

      {!isLast && <div className={`h-px ${faded ? 'bg-[#e8d5d5]' : 'bg-[#731515]/8'}`} />}
    </motion.div>
  );
}

export default function EventsSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="eventi" className="py-28 md:py-32 relative overflow-hidden">
      <div className="fog-center" />

      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reducedMotion ? 0 : 0.8 }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">2026 CALENDAR</div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            EVENTS
          </h2>
          <p
            className="mt-6 text-lg text-[#7a4a4a] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Exclusive experiences reserved for our members — tastings, tours and unforgettable evenings
          </p>
        </motion.div>

        <div>
          {EVENTS.map((event, i) => (
            <EventRow
              key={event.id}
              event={event}
              index={i}
              isLast={i === EVENTS.length - 1}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
