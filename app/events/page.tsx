import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EventsHero from '@/components/EventsHero';
import EventStatusBadge from '@/components/EventStatusBadge';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  dbEventToEventData,
  getEventDisplayStatus,
  type EventData,
  type DbEvent,
  type DisplayStatus,
} from '@/lib/events';

export const dynamic = 'force-dynamic';

/* ── Event row ── */
function EventRow({ event, isLast, displayStatus }: { event: EventData; isLast: boolean; displayStatus: DisplayStatus }) {
  const faded      = displayStatus === 'past' || displayStatus === 'closed';
  const detailHref = `/events/${event.slug}`;
  const hasDetail  = displayStatus !== 'past';

  const thumbnailClass = `relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 overflow-hidden border rounded-lg ${
    faded ? 'border-[#e8d5d5]' : 'border-[#d4b0b0]/40'
  }${hasDetail ? ' cursor-pointer' : ''}`;

  const titleClass = `text-lg md:text-xl font-medium leading-snug mb-2 ${
    faded
      ? 'text-[#ccc]'
      : hasDetail
        ? 'text-[#1a0505] hover:text-[#731515] transition-colors duration-300 cursor-pointer'
        : 'text-[#1a0505]'
  } ${event.titleStrikethrough ? 'line-through decoration-[#731515]/60' : ''}`;

  return (
    <div>
      <div className="flex items-center gap-4 sm:gap-5 md:gap-8 py-6 sm:py-8 md:py-10 group">

        {/* Thumbnail — links to detail page */}
        {event.image_url && (
          hasDetail ? (
            <Link href={detailHref} className={thumbnailClass}>
              <Image
                src={event.image_url}
                alt={event.title}
                fill
                className={`object-cover transition-transform duration-500 group-hover:scale-105 ${faded ? 'opacity-40' : ''}`}
                sizes="(max-width:640px) 64px, (max-width:768px) 80px, 96px"
              />
            </Link>
          ) : (
            <div className={thumbnailClass}>
              <Image
                src={event.image_url}
                alt={event.title}
                fill
                className={`object-cover ${faded ? 'opacity-40' : ''}`}
                sizes="(max-width:640px) 64px, (max-width:768px) 80px, 96px"
              />
            </div>
          )
        )}

        {/* Date column */}
        <div className="flex flex-col items-end w-10 sm:w-12 md:w-[72px] shrink-0">
          <span className={`text-[8px] tracking-[0.4em] mb-0.5 ${faded ? 'text-[#ccc]' : 'text-[#731515]'}`}>
            {event.month}
          </span>
          <span
            className={`text-[2rem] sm:text-[2.6rem] md:text-[3.2rem] font-light leading-none ${
              faded ? 'text-[#ddd]' : 'text-[#1a0505]'
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
        <div className={`w-px self-stretch shrink-0 ${faded ? 'bg-[#e8d5d5]' : 'bg-[#731515]/15'}`} />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className={`text-[8px] tracking-[0.4em] mb-2 ${faded ? 'text-[#ccc]' : 'text-[#7a4a4a]/70'}`}>
            {event.type}
          </div>

          {/* Title — links to detail page */}
          {hasDetail ? (
            <Link
              href={detailHref}
              className={titleClass}
              style={{ fontFamily: 'var(--font-syne)', display: 'block' }}
            >
              {event.title}
            </Link>
          ) : (
            <h2 className={titleClass} style={{ fontFamily: 'var(--font-syne)' }}>
              {event.title}
            </h2>
          )}

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

          {/* Mobile badge */}
          <div className="mt-4 sm:hidden">
            <EventStatusBadge displayStatus={displayStatus} slug={event.slug} isListOnly={event.isListOnly} />
          </div>
        </div>

        {/* Desktop badge */}
        <div className="shrink-0 self-center hidden sm:block">
          <EventStatusBadge displayStatus={displayStatus} slug={event.slug} isListOnly={event.isListOnly} />
        </div>
      </div>

      {!isLast && <div className={`h-px ${faded ? 'bg-[#ede0e0]' : 'bg-[#731515]/8'}`} />}
    </div>
  );
}

/* ── Page ── */
export default async function EventsPage() {
  let dbEvents: EventData[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('published', true)
      .gte('date', today)
      .order('date', { ascending: true });

    if (!error && data) {
      dbEvents = (data as DbEvent[]).map(dbEventToEventData);
    }
  } catch {/* fall through */}

  const events = dbEvents;
  const t = await getTranslations('home');

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── HERO IMAGE ── */}
        <EventsHero />

        {/* ── Event list ── */}
        <section className="relative overflow-hidden pt-12 pb-20">
          <div className="fog-right" style={{ top: '10%' }} />
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            {events.length > 0 ? (
              events.map((event, i) => (
                <EventRow
                  key={event.slug}
                  event={event}
                  isLast={i === events.length - 1}
                  displayStatus={getEventDisplayStatus(event, today)}
                />
              ))
            ) : (
              <div className="flex justify-center">
                <div className="w-full max-w-xl rounded-[1.5rem] border border-[#e8d5d5] bg-white/90 px-6 py-10 sm:px-10 sm:py-12 mt-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] tracking-[0.5em] uppercase text-[#731515] mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {t('eventPageNextExperienceLabel')}
                    </div>
                    <h3
                      className="text-2xl md:text-[2.2rem] font-medium tracking-tight text-[#1a0505] leading-tight"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {t('eventPageNextExperienceTitle')}
                    </h3>
                    <p
                      className="mt-3 text-base md:text-lg leading-7 text-[#7a4a4a] font-light max-w-lg"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {t('eventPageNextExperienceBody')}
                    </p>

                    {/* Teaser inside the card: separator + teaser content */}
                    <div className="w-full mt-8">
                      <div className="mx-auto w-full max-w-xs">
                        <div className="h-px bg-[#e8d5d5] opacity-30 mb-6" />
                        <div className="text-[10px] tracking-[0.5em] uppercase text-[#731515] mb-2" style={{ fontFamily: 'var(--font-nunito)' }}>
                          {t('eventPageTeaserLabel')}
                        </div>
                        <div className="text-2xl md:text-3xl font-semibold text-[#1a0505] mb-2" style={{ fontFamily: 'var(--font-syne)' }}>
                          {t('eventPageTeaserDate')}
                        </div>
                        <div className="text-sm text-[#7a4a4a] font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
                          {t('eventPageTeaserBody')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
