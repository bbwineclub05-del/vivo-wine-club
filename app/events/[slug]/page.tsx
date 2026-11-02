import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, Lock, MapPin, Ticket, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SiteNav } from '@/components/ui/SiteNav';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData,
  eventDateLabel, getEventDisplayStatus, type EventData, type DbEvent, type DisplayStatus } from '@/lib/events';
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
    const title = `${event.title} | Vivo Wine Club`;
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

/**
 * La scheda di un evento.
 *
 * È il passo prima del biglietto: deve dire cosa, quando, dove e
 * quanto in tre secondi, e avere il pulsante sempre a portata di
 * pollice. Prima il pulsante stava a fondo pagina, dopo la
 * descrizione e le note pratiche: su un telefono si prenotava solo se
 * si aveva la pazienza di scorrere fino in fondo.
 */

function Info({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-rule-paper p-4">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <div className="min-w-0">
        <p className="text-fine text-on-paper-muted">{label}</p>
        <p className="mt-1 text-body font-medium">{value}</p>
        {sub && <p className="mt-0.5 text-fine text-on-paper-muted">{sub}</p>}
      </div>
    </div>
  );
}

/** Il pulsante: dice sempre la verità sullo stato dell'evento. */
function Azione({ event, stato, isListOnly, partnerCode, etichette, pieno }: {
  event: EventData;
  stato: DisplayStatus;
  isListOnly?: boolean;
  partnerCode?: string;
  etichette: Record<string, string>;
  pieno?: boolean;
}) {
  const base = `inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full px-7 text-fine font-medium ${pieno ? 'w-full' : ''}`;

  if (stato === 'past' || stato === 'closed' || stato === 'soldout' || stato === 'soon') {
    const testo =
      stato === 'past' ? etichette.ended
      : stato === 'closed' ? etichette.closed
      : stato === 'soldout' ? etichette.soldOut
      : etichette.soon;
    return (
      <span className={`${base} cursor-not-allowed border border-rule-paper text-on-paper-muted`}>
        {testo}
      </span>
    );
  }

  if (isListOnly) {
    return (
      <a href="#iscrizione" className={`${base} bg-accent text-paper transition-opacity hover:opacity-90`}>
        <Ticket size={17} strokeWidth={1.9} />
        {etichette.list}
      </a>
    );
  }

  return (
    <Link
      href={partnerCode ? `/checkout/${event.slug}?partner=${partnerCode}` : `/checkout/${event.slug}`}
      className={`${base} bg-accent text-paper transition-opacity hover:opacity-90`}
    >
      <Ticket size={17} strokeWidth={1.9} />
      {etichette.book}
    </Link>
  );
}

export default async function EventPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const partnerCode = typeof sp.partner === 'string' ? sp.partner.toUpperCase() : undefined;
  const t = await getTranslations('events');

  let event: EventData | null = null;
  let raw: DbEvent | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (getSupabaseAdmin() as any)
      .from('events')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (data) {
      raw = data as DbEvent;
      event = dbEventToEventData(raw);
    }
  } catch {
    /* gestito sotto */
  }

  if (!event || !raw) notFound();

  const oggi = new Date().toISOString().slice(0, 10);
  const stato = getEventDisplayStatus(event, oggi);
  const isListOnly = !!raw.is_list_only;
  const capienza = raw.capacity && raw.capacity > 0 ? raw.capacity : null;

  const etichette = {
    book: t('bookYourSpot'),
    list: t('joinTheList'),
    ended: t('eventEnded'),
    closed: t('registrationClosed'),
    soldOut: t('bannerSoldOut'),
    soon: t('bannerSoon'),
  };

  const prezzo =
    event.price === 0
      ? t('freeEntry')
      : raw.status === 'open' && isListOnly
        ? `${event.price} €, ${t('paymentAtDoor')}`
        : `${event.price} € / ${t('perPerson')}`;

  return (
    <>
      <EventViewTracker eventTitle={event.title} />
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        {/* ── La locandina ── */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink sm:aspect-[16/9] lg:aspect-[21/9]">
          {event.image_url && (
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1180px] px-5 pb-7 lg:px-10 lg:pb-10">
            <p className="ds-on-ink text-fine uppercase tracking-[0.18em] text-on-ink-muted">{event.type}</p>
            <h1 className="ds-display ds-on-ink mt-2 text-[clamp(2rem,6vw,3.4rem)] leading-[0.98] tracking-[-0.03em] text-on-ink">
              {event.title}
            </h1>
            <p className="ds-on-ink mt-3 text-body text-on-ink-muted">
              {eventDateLabel(event)}
              {event.time ? ` · ${event.time}` : ''} · {event.location}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1180px] px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-7 lg:px-10 lg:pb-20">
          <Link
            href="/events"
            className="ds-link group mb-7 inline-flex min-h-[44px] items-center gap-2 text-fine no-underline hover:text-accent"
          >
            <ArrowLeft size={15} strokeWidth={1.9} className="transition-transform group-hover:-translate-x-0.5" />
            {t('allEvents')}
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-14">
            <div className="min-w-0">
              {/* ── I quattro dati ── */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Info
                  icon={<CalendarDays size={18} strokeWidth={1.8} />}
                  label={t('labelDate')}
                  value={eventDateLabel(event)}
                />
                {event.time && (
                  <Info icon={<Clock size={18} strokeWidth={1.8} />} label={t('labelTime')} value={event.time} />
                )}
                <Info
                  icon={<MapPin size={18} strokeWidth={1.8} />}
                  label="Dove"
                  value={event.location}
                  sub={raw.location_full ?? undefined}
                />
                <Info icon={<Ticket size={18} strokeWidth={1.8} />} label={t('labelPrice')} value={prezzo} />
                <Info
                  icon={<Lock size={18} strokeWidth={1.8} />}
                  label={t('labelAccess')}
                  value={event.membersOnly ? t('membersOnly') : t('openToAll')}
                />
                {capienza && (
                  <Info
                    icon={<Users size={18} strokeWidth={1.8} />}
                    label={t('labelCapacity')}
                    value={`${capienza} ${t('spots')}`}
                  />
                )}
              </div>

              {event.description && (
                <section className="mt-10">
                  <h2 className="ds-display mb-4 text-[22px] leading-none tracking-[-0.02em]">{t('theEvent')}</h2>
                  <div className="flex max-w-[64ch] flex-col gap-4">
                    {event.description.split(/\n\n+/).map((p, i) => (
                      <p key={i} className="text-lead text-on-paper-muted">{p}</p>
                    ))}
                  </div>
                </section>
              )}

              {raw.parking_map_url && (
                <section className="mt-10">
                  <h2 className="ds-display mb-4 text-[22px] leading-none tracking-[-0.02em]">{t('practicalInfo')}</h2>
                  <a
                    href={raw.parking_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center rounded-full border border-rule-paper px-5 text-fine font-medium"
                  >
                    Dove parcheggiare
                  </a>
                </section>
              )}

              {isListOnly && stato !== 'past' && stato !== 'closed' && (
                <section id="iscrizione" className="mt-10 scroll-mt-24">
                  <EventGuestForm
                    eventSlug={event.slug}
                    eventTitle={event.title}
                    eventDate={eventDateLabel(event)}
                    eventLocation={event.location}
                    partnerCode={partnerCode}
                    showRouteOption={!!raw.parking_map_url_2}
                    eventPrice={event.price}
                  />
                </section>
              )}
            </div>

            {/* ── Il pulsante, sul computer ── */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-rule-paper p-6">
                <p className="ds-numeric text-[26px] font-medium">{prezzo}</p>
                <p className="mt-1 text-fine text-on-paper-muted">
                  {eventDateLabel(event)} · {event.location}
                </p>
                <div className="mt-5">
                  <Azione
                    event={event}
                    stato={stato}
                    isListOnly={isListOnly}
                    partnerCode={partnerCode}
                    etichette={etichette}
                    pieno
                  />
                </div>
                <p className="mt-3 text-center text-fine text-on-paper-muted">{t('secureCheckout')}</p>
              </div>
            </aside>
          </div>
        </div>

        {/* ── Il pulsante, sul telefono: sempre in fondo allo schermo ── */}
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-rule-paper bg-paper/95 px-5 py-3 backdrop-blur lg:hidden"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3">
            <p className="ds-numeric shrink-0 text-[17px] font-medium leading-none">{prezzo}</p>
            <div className="flex-1">
              <Azione
                event={event}
                stato={stato}
                isListOnly={isListOnly}
                partnerCode={partnerCode}
                etichette={etichette}
                pieno
              />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
