import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, CalendarDays, Clock, Users, Ticket } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, type EventData, type DbEvent } from '@/lib/events';
import EventGuestForm from '@/components/EventGuestForm';
import EventViewTracker from '@/components/EventViewTracker';

export const dynamic = 'force-dynamic';

/* ── Metadata ── */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('events').select('*').eq('slug', slug).single();
    if (!data) return {};
    const event = dbEventToEventData(data as DbEvent);
    const title = `${event.title} — Vivo Wine Club`;
    const description = event.description || `Scopri e prenota il tuo posto per ${event.title}.`;
    const raw = event.image_url;
    const imageUrl = raw
      ? (raw.startsWith('http') ? raw : `https://vivowineclub.com${raw.startsWith('/') ? '' : '/'}${raw}`)
      : 'https://vivowineclub.com/logobianco.png';
    return {
      title,
      description,
      openGraph: {
        title, description,
        url: `https://vivowineclub.com/events/${slug}`,
        siteName: 'Vivo Wine Club',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: event.title }],
        type: 'website',
      },
      twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
    };
  } catch { return {}; }
}

/* ── Info card ── */
function InfoCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[8px] tracking-[0.4em] text-[#7a4a4a]/50">{label}</span>
      </div>
      <div
        className="text-sm font-medium text-[#1a0505]"
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[11px] text-[#7a4a4a]/50 leading-snug"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── CTA button ── */
function CtaButton({
  event,
  isPast,
  full,
  bookLabel,
  listLabel,
  endedLabel,
  isListOnly,
  partnerCode,
}: {
  event: EventData;
  isPast: boolean;
  full?: boolean;
  bookLabel: string;
  listLabel: string;
  endedLabel: string;
  isListOnly?: boolean;
  partnerCode?: string;
}) {
  const cls = full ? 'w-full justify-center' : 'sm:inline-flex';

  if (isPast || event.status === 'completed') {
    return (
      <span
        className={`${cls} inline-flex items-center gap-3 px-8 py-4 bg-[#e8e8e8] text-[#aaa] text-[9px] tracking-[0.4em] rounded-lg cursor-not-allowed`}
      >
        {endedLabel}
      </span>
    );
  }
  if (event.status === 'soldout') {
    return (
      <span
        className={`${cls} inline-flex items-center gap-3 px-8 py-4 bg-[#3a3a3a] text-white text-[9px] tracking-[0.4em] rounded-lg cursor-not-allowed`}
      >
        SOLD OUT
      </span>
    );
  }
  if (event.status === 'soon') {
    return (
      <span
        className={`${cls} inline-flex items-center gap-3 px-8 py-4 border border-[#ccc] text-[#aaa] text-[9px] tracking-[0.4em] rounded-lg`}
      >
        COMING SOON
      </span>
    );
  }
  if (isListOnly) {
    return (
      <a
        href="#guest-form"
        className={`${cls} inline-flex items-center gap-3 px-8 py-4 bg-[#731515] text-white text-[9px] tracking-[0.4em] hover:bg-[#9b2323] active:bg-[#5a1010] transition-colors rounded-lg`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        <Ticket size={14} />
        {listLabel}
      </a>
    );
  }
  const checkoutHref = partnerCode
    ? `/checkout/${event.slug}?partner=${partnerCode}`
    : `/checkout/${event.slug}`;
  return (
    <Link
      href={checkoutHref}
      className={`${cls} inline-flex items-center gap-3 px-8 py-4 bg-[#731515] text-white text-[9px] tracking-[0.4em] hover:bg-[#9b2323] active:bg-[#5a1010] transition-colors rounded-lg`}
      style={{ fontFamily: 'var(--font-nunito)' }}
    >
      <Ticket size={14} />
      {bookLabel}
      {event.price > 0 && (
        <span className="opacity-60 normal-case tracking-normal text-[12px] font-medium">
          · €{event.price}
        </span>
      )}
    </Link>
  );
}

/* ── Page ── */
export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp          = await searchParams;
  const refCode     = typeof sp.ref     === 'string' ? sp.ref.toUpperCase()     : undefined;
  const partnerCode = typeof sp.partner === 'string' ? sp.partner.toUpperCase() : undefined;
  const t = await getTranslations('events');

  let event: EventData | undefined;
  let rawDate: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawNotes: string | null = null;
  let guestListEnabled = false;
  let isListOnly = false;

  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();
    if (data) {
      event            = dbEventToEventData(data as DbEvent);
      rawDate          = (data as DbEvent).date;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawNotes         = (data as any).notes ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guestListEnabled = (data as any).guest_list_enabled ?? false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      isListOnly       = (data as any).is_list_only ?? false;
      // list-only events always show the registration form
      if (isListOnly) guestListEnabled = true;
    }
  } catch {/* fall through */}

  if (!event) notFound();

  const today  = new Date().toISOString().slice(0, 10);
  const isPast = rawDate ? rawDate.slice(0, 10) < today : false;

  return (
    <>
      <EventViewTracker eventTitle={event.title} />
      <Navbar />
      <main>

        {/* ── Hero ── */}
        <section className="relative h-[65vh] sm:h-[75vh] min-h-[380px] overflow-hidden bg-[#2a0808]">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              priority
              className="object-contain object-center"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0" />
          )}

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" />

          {/* Back */}
          <div className="absolute top-20 left-4 sm:left-8 lg:left-12 z-10">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-[9px] tracking-[0.35em] transition-colors duration-200"
            >
              <ArrowLeft size={13} />
              {t('allEvents')}
            </Link>
          </div>

          {/* Title block */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 pb-10 sm:pb-14">
              <div className="text-[9px] tracking-[0.55em] text-white/50 mb-3 uppercase">
                {event.type}
              </div>
              <h1
                className="text-[clamp(2rem,5vw,3.8rem)] font-light text-white leading-tight mb-4 max-w-3xl"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {event.title}
              </h1>
              <p
                className="text-sm text-white/55"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {event.day} {event.month} {event.year}
                {event.time ? ` · ${event.time}` : ''}
                {' · '}
                {event.location}
              </p>
            </div>
          </div>
        </section>

        {/* ── Content ── */}
        <section className="bg-[#fdf9f9] pb-36 sm:pb-24">
          <div className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-16 pt-10 sm:pt-14">

            {/* Quick info strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-10 mb-10 border-b border-[#eddada]">
              <InfoCard
                icon={<CalendarDays size={14} className="text-[#731515] shrink-0" />}
                label={t('labelDate')}
                value={`${event.day} ${event.month} ${event.year}`}
              />
              {event.time && (
                <InfoCard
                  icon={<Clock size={14} className="text-[#731515] shrink-0" />}
                  label={t('labelTime')}
                  value={event.time}
                />
              )}
              <InfoCard
                icon={<MapPin size={14} className="text-[#731515] shrink-0" />}
                label="LOCATION"
                value={event.location}
                sub={event.locationFull !== event.location ? event.locationFull : undefined}
              />
              <InfoCard
                icon={<Ticket size={14} className="text-[#731515] shrink-0" />}
                label={t('labelPrice')}
                value={
                  isListOnly || !event.price
                    ? t('freeEntry')
                    : `€${event.price} / ${t('perPerson')}`
                }
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(event as any).capacity != null && (
                <InfoCard
                  icon={<Users size={14} className="text-[#731515] shrink-0" />}
                  label={t('labelCapacity')}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  value={`${(event as any).capacity} ${t('spots')}`}
                />
              )}
            </div>

            {/* Status banner — sold out / past / soon */}
            {(isPast || event.status === 'soldout' || event.status === 'soon') && (
              <div className={`rounded-xl px-5 py-4 mb-10 text-sm border ${
                isPast || event.status === 'soldout'
                  ? 'bg-[#f5eded] border-[#eddada] text-[#731515]'
                  : 'bg-[#f5f5f0] border-[#e0e0d5] text-[#6b6b55]'
              }`} style={{ fontFamily: 'var(--font-nunito)' }}>
                {isPast
                  ? t('bannerPast')
                  : event.status === 'soldout'
                    ? t('bannerSoldOut')
                    : t('bannerSoon')}
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="mb-12">
                <div className="text-[9px] tracking-[0.5em] text-[#731515] mb-5">
                  {t('theEvent')}
                </div>
                <p
                  className="text-[15px] text-[#4a2a2a] leading-[1.85] whitespace-pre-line"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {event.description}
                </p>
              </div>
            )}

            {/* Notes / practical info */}
            {rawNotes && (
              <div className="mb-12 bg-white border border-[#eddada] rounded-xl p-6 sm:p-8">
                <div className="text-[9px] tracking-[0.5em] text-[#731515] mb-5">
                  {t('practicalInfo')}
                </div>
                <p
                  className="text-sm text-[#7a4a4a] leading-[1.8] whitespace-pre-line"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {rawNotes}
                </p>
              </div>
            )}

            {/* Guest list registration form */}
            {guestListEnabled && !isPast && (
              <EventGuestForm
                eventSlug={event.slug}
                eventTitle={event.title}
                eventDate={`${event.day} ${event.month} ${event.year}`}
                eventLocation={event.locationFull || event.location}
                refCode={refCode}
                partnerCode={partnerCode}
                showRouteOption={slug === 'vivo-wine-ride-jul-2026'}
              />
            )}

            {/* CTA — desktop (hidden for list-only events: the form already has a submit button) */}
            {!isListOnly && (
              <div className="hidden sm:flex items-center gap-4 pt-2 mt-8">
                <CtaButton
                  event={event}
                  isPast={isPast}
                  bookLabel={t('bookYourSpot')}
                  listLabel={t('joinTheList')}
                  endedLabel={t('eventEnded')}
                  isListOnly={false}
                  partnerCode={partnerCode}
                />
                {event.status === 'open' && !isPast && (
                  <span
                    className="text-[11px] text-[#7a4a4a]/50"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {t('secureCheckout')}
                  </span>
                )}
              </div>
            )}

          </div>
        </section>

        {/* ── Sticky CTA — mobile only (hidden for list-only events) ── */}
        {!isListOnly && (
          <div
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3"
            style={{ background: 'rgba(253,249,249,0.96)', backdropFilter: 'blur(8px)', borderTop: '1px solid #eddada' }}
          >
            <CtaButton
              event={event}
              isPast={isPast}
              full
              bookLabel={t('bookYourSpot')}
              listLabel={t('joinTheList')}
              endedLabel={t('eventEnded')}
              isListOnly={false}
              partnerCode={partnerCode}
            />
          </div>
        )}

      </main>
      <Footer />
    </>
  );
}
