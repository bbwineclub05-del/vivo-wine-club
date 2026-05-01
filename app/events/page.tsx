import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { EVENTS, type EventData, type EventStatus } from '@/lib/events';

/* ── Status badge ── */
function StatusBadge({ status, slug }: { status: EventStatus; slug: string }) {
  if (status === 'open') {
    return (
      <Link
        href={`/checkout/${slug}`}
        className="inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#731515] text-white hover:bg-[#aa4848] transition-colors duration-300 whitespace-nowrap"
      >
        BUY TICKETS
      </Link>
    );
  }
  if (status === 'soldout') {
    return (
      <span className="inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#3a3a3a] text-white whitespace-nowrap">
        SOLD OUT
      </span>
    );
  }
  if (status === 'soon') {
    return (
      <span className="inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 border border-[#ccc] text-[#aaa] whitespace-nowrap">
        COMING SOON
      </span>
    );
  }
  return (
    <span className="inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 border border-[#ddd] text-[#bbb] whitespace-nowrap">
      COMPLETED
    </span>
  );
}

/* ── Event row ── */
function EventRow({ event, isLast }: { event: EventData; isLast: boolean }) {
  const faded = event.status === 'completed';

  return (
    <div>
      <div className="flex items-start gap-4 sm:gap-5 md:gap-8 py-6 sm:py-8 md:py-10 group">

        {/* Date column */}
        <div className="flex flex-col items-end w-10 sm:w-12 md:w-[72px] shrink-0 pt-1">
          <span className={`text-[8px] tracking-[0.4em] mb-0.5 ${faded ? 'text-[#ccc]' : 'text-[#731515]'}`}>
            {event.month}
          </span>
          <span
            className={`text-[2rem] sm:text-[2.6rem] md:text-[3.2rem] font-light leading-none ${
              faded ? 'text-[#ddd]' : 'text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300'
            }`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.day}
          </span>
          <span className={`text-[8px] tracking-[0.15em] mt-0.5 ${faded ? 'text-[#ddd]' : 'text-[#7a4a4a]/60'}`}>
            {event.year}
          </span>
        </div>

        {/* Vertical line */}
        <div className={`w-px self-stretch shrink-0 mt-1 ${faded ? 'bg-[#e8d5d5]' : 'bg-[#731515]/15'}`} />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className={`text-[8px] tracking-[0.4em] mb-2 ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]/70'}`}>
            {event.type}
          </div>
          <h2
            className={`text-lg md:text-xl font-medium leading-snug mb-2 ${
              faded ? 'text-[#ccc]' : 'text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300'
            }`}
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {event.title}
          </h2>
          <div className={`flex items-center gap-2 text-xs mb-3 ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]'}`}>
            <MapPin size={10} className={faded ? 'text-[#ccc] shrink-0' : 'text-[#731515] shrink-0'} />
            <span>{event.locationFull}</span>
          </div>
          <p
            className={`text-sm leading-relaxed max-w-xl ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]'}`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {event.description}
          </p>

          {/* Mobile badge — shown below description */}
          <div className="mt-4 sm:hidden">
            <StatusBadge status={event.status} slug={event.slug} />
          </div>
        </div>

        {/* Desktop badge */}
        <div className="shrink-0 self-center hidden sm:block">
          <StatusBadge status={event.status} slug={event.slug} />
        </div>
      </div>

      {!isLast && <div className={`h-px ${faded ? 'bg-[#ede0e0]' : 'bg-[#731515]/8'}`} />}
    </div>
  );
}

/* ── Page ── */
export default function EventsPage() {
  const ordered = EVENTS;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">

        {/* ── HERO IMAGE ── */}
        <div className="relative w-full" style={{ height: 350 }}>
          <Image
            src="/events/wine-party8.jpg"
            alt="Events — Vivo Wine Club"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#731515]/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">2026 CALENDAR</div>
            <h1
              className="text-[clamp(2rem,5vw,4rem)] font-light text-white leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Events
            </h1>
            <p
              className="mt-4 text-sm md:text-base text-white/75 font-light italic max-w-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              All our upcoming and past experiences — tastings, winery tours, and wine parties across Europe.
            </p>
          </div>
          <div className="absolute top-6 left-6 md:left-10 z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>
          </div>
        </div>

        {/* ── Event list ── */}
        <section className="relative overflow-hidden pb-28">
          <div className="fog-right" style={{ top: '10%' }} />
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            {ordered.map((event, i) => (
              <EventRow
                key={event.slug}
                event={event}
                isLast={i === ordered.length - 1}
              />
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
