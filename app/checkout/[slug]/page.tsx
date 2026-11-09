import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SiteNav } from '@/components/ui/SiteNav';
import SoloSoci from './SoloSoci';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, eventDateLabel, getEventDisplayStatus, type EventData, type DbEvent } from '@/lib/events';
import CheckoutForm from './CheckoutForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();
    if (!data) return {};

    const event = dbEventToEventData(data as DbEvent);
    const title       = `${event.title} | Vivo Wine Club`;
    const description = event.description || `Get your ticket for ${event.title}.`;

    // Ensure absolute URL — Supabase storage URLs already start with https://
    const raw      = event.image_url;
    const imageUrl = raw
      ? (raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://vivowineclub.com${raw.startsWith('/') ? '' : '/'}${raw}`)
      : 'https://vivowineclub.com/logobianco.png';
    const pageUrl  = `https://vivowineclub.com/checkout/${slug}`;

    console.log(`[OG] /checkout/${slug} →`, { imageUrl, title });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url:      pageUrl,
        siteName: 'Vivo Wine Club',
        images:   [{ url: imageUrl, width: 1200, height: 630, alt: event.title }],
        type:     'website',
      },
      twitter: {
        card:   'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {};
  }
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp          = await searchParams;
  const partnerCode = typeof sp.partner === 'string' ? sp.partner.toUpperCase() : undefined;

  let event: EventData | undefined;

  // Try DB first
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();
    if (data) {
      event          = dbEventToEventData(data as DbEvent);
    }
  } catch {/* fall through */}

  if (!event) notFound();

  /* Si compra solo quando l'evento e' davvero aperto.
     Prima `soon` non era nell'elenco: un evento ancora da aprire si
     poteva comprare arrivando qui con il suo indirizzo, e dall'area
     del socio ci si arrivava con un clic. Il pagamento lo fermava la
     rotta piu' avanti, quindi soldi non ne ha presi nessuno — ma la
     persona compilava nome, cognome, telefono e consensi per
     scoprire alla fine che non si poteva. */
  const today         = new Date().toISOString().slice(0, 10);
  const displayStatus = getEventDisplayStatus(event, today);
  if (displayStatus !== 'open') {
    return <EventChiuso event={event} stato={displayStatus} />;
  }

  // Riservato ai soci: prima la porta, poi il modulo. Il controllo che
  // conta e' nel server del checkout; questo serve solo a non far
  // compilare tutto a chi verrebbe respinto alla fine.
  if (event.membersOnly) {
    return (
      <>
        <SiteNav />
        <main className="ds bg-paper text-on-paper">
          <SoloSoci
            event={event}
            partnerCode={partnerCode}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="ds bg-paper text-on-paper">
        <CheckoutForm
          event={event}
          partnerCode={partnerCode}
        />
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Quando non si può più comprare.
 *
 * Una pagina sola per i tre casi — concluso, chiuso, esaurito — che
 * dice cosa è successo e dove andare adesso, invece di lasciare la
 * persona su un vicolo cieco.
 */
async function EventChiuso({ event, stato }: { event: EventData; stato: string }) {
  const t = await getTranslations('events');

  const titolo =
    stato === 'closed' ? t('coClosedTitle')
    : stato === 'soldout' ? t('coSoldOutTitle')
    : stato === 'soon' ? t('coSoonTitle')
    : t('coPastTitle');

  return (
    <>
      <SiteNav />
      <main className="ds flex min-h-[70vh] items-center bg-paper text-on-paper">
        <div className="mx-auto w-full max-w-[560px] px-5 py-16 text-center lg:px-10">
          <h1 className="ds-display text-[clamp(1.8rem,5vw,2.4rem)] leading-tight tracking-[-0.03em]">
            {titolo}
          </h1>
          <p className="mt-4 text-lead text-on-paper-muted">{event.title}</p>
          <p className="mt-2 text-body text-on-paper-muted">
            {eventDateLabel(event)} · {event.location}
          </p>
          <p className="mt-6 text-body text-on-paper-muted">
            {stato === 'soon' ? t('coSoonBody') : t('coPastBody')}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/events"
              className="inline-flex min-h-[52px] items-center rounded-full bg-accent px-6 text-fine font-medium text-paper"
            >
              {t('coSeeEvents')}
            </Link>
            <Link
              href="/membership"
              className="inline-flex min-h-[52px] items-center rounded-full border border-rule-paper px-6 text-fine font-medium"
            >
              Diventa socio
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
