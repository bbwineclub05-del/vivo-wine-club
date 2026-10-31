import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SiteNav } from '@/components/ui/SiteNav';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, getEventDisplayStatus, type EventData, type DbEvent } from '@/lib/events';
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
  const refCode     = typeof sp.ref     === 'string' ? sp.ref.toUpperCase()     : undefined;
  const partnerCode = typeof sp.partner === 'string' ? sp.partner.toUpperCase() : undefined;

  let event: EventData | undefined;
  let referralEnabled = false;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      referralEnabled = !!(data as any).referral_enabled;
    }
  } catch {/* fall through */}

  if (!event) notFound();

  // Past or closed event: show "concluso" page instead of checkout form
  const today         = new Date().toISOString().slice(0, 10);
  const displayStatus = getEventDisplayStatus(event, today);
  if (displayStatus === 'past' || displayStatus === 'closed' || displayStatus === 'soldout') {
    return <EventChiuso event={event} stato={displayStatus} />;
  }

  return (
    <>
      <SiteNav />
      <main className="ds bg-paper text-on-paper">
        <CheckoutForm
          event={event}
          refCode={refCode}
          partnerCode={partnerCode}
          referralEnabled={referralEnabled}
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
            {event.day} {event.month} {event.year} · {event.location}
          </p>
          <p className="mt-6 text-body text-on-paper-muted">{t('coPastBody')}</p>

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
