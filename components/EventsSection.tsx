'use client';

import { motion } from 'framer-motion';
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

function StatusBadge({ status }: { status: EventStatus }) {
  if (status === 'open') {
    return (
      <button className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 bg-[#731515] text-[#F5EEE6] border border-[#731515] hover:bg-[#aa4848] hover:border-[#aa4848] transition-all duration-300 whitespace-nowrap">
        BUY TICKETS
      </button>
    );
  }
  if (status === 'soon') {
    return (
      <span className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 border border-[#3a3a3a] text-[#565656] whitespace-nowrap">
        COMING SOON
      </span>
    );
  }
  return (
    <span className="text-[9px] tracking-[0.28em] px-4 lg:px-5 py-2.5 border border-[#242424] text-[#363636] whitespace-nowrap">
      COMPLETED
    </span>
  );
}

function EventRow({ event, index, isLast }: { event: Event; index: number; isLast: boolean }) {
  const faded = event.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-5 md:gap-8 py-6 md:py-7 group">

        {/* ── Date column ── */}
        <div className="flex flex-col items-end w-12 md:w-[72px] shrink-0">
          <span className={`text-[8px] tracking-[0.4em] mb-0.5 ${faded ? 'text-[#2e2e2e]' : 'text-[#C9A84C]'}`}>
            {event.month}
          </span>
          <span
            className={`text-[2.6rem] md:text-[3.2rem] font-light leading-none transition-colors duration-300 ${
              faded
                ? 'text-[#2a2a2a]'
                : 'text-[#F5EEE6] group-hover:text-[#C9A84C]'
            }`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.day}
          </span>
        </div>

        {/* ── Vertical line ── */}
        <div className={`w-px self-stretch shrink-0 ${faded ? 'bg-[#222]' : 'bg-[#C9A84C]/18'}`} />

        {/* ── Event details ── */}
        <div className="flex-1 min-w-0">
          <div className={`text-[8px] tracking-[0.4em] mb-1.5 ${faded ? 'text-[#2e2e2e]' : 'text-[#C4B5A0]/55'}`}>
            {event.type}
          </div>
          <h3
            className={`text-base md:text-lg font-medium leading-snug mb-2 transition-colors duration-300 ${
              faded
                ? 'text-[#353535]'
                : 'text-[#F5EEE6] group-hover:text-[#C9A84C]'
            }`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.title}
          </h3>
          <div className={`flex items-center gap-2 text-xs ${faded ? 'text-[#2e2e2e]' : 'text-[#C4B5A0]'}`}>
            <MapPin size={10} className={faded ? 'text-[#2e2e2e] shrink-0' : 'text-[#C9A84C] shrink-0'} />
            <span>{event.location}</span>
            {!faded && (
              <>
                <span className="text-[#C9A84C]/25 mx-0.5">·</span>
                <span>€{event.price}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Status badge ── */}
        <div className="shrink-0 self-center hidden sm:block">
          <StatusBadge status={event.status} />
        </div>
      </div>

      {/* Mobile badge */}
      <div className="sm:hidden pb-5 pl-[72px]">
        <StatusBadge status={event.status} />
      </div>

      {/* Divider */}
      {!isLast && (
        <div className={`h-px ${faded ? 'bg-[#1c1c1c]' : 'bg-[#C9A84C]/8'}`} />
      )}
    </motion.div>
  );
}

export default function EventsSection() {
  return (
    <section id="eventi" className="py-28 md:py-32 bg-[#0d0306] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#5b1a14]/6 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />

      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-4">
            2026 CALENDAR
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            EVENTS
          </h2>
          <p
            className="mt-6 text-lg text-[#C4B5A0] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Exclusive experiences reserved for our members — tastings, tours and unforgettable evenings
          </p>
        </motion.div>

        {/* Event list */}
        <div>
          {EVENTS.map((event, i) => (
            <EventRow
              key={event.id}
              event={event}
              index={i}
              isLast={i === EVENTS.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
