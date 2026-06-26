import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, CalendarDays } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, type EventData, type DbEvent } from '@/lib/events';
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
    const title       = `${event.title} — Vivo Wine Club`;
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
  let rawDate: string | undefined;

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
      event   = dbEventToEventData(data as DbEvent);
      rawDate = (data as DbEvent).date;
    }
  } catch {/* fall through */}

  if (!event) notFound();

  // Past event: show "concluso" page instead of checkout form
  const today  = new Date().toISOString().slice(0, 10);
  const isPast = rawDate ? rawDate.slice(0, 10) < today : false;
  if (isPast) {
    return <EventConclusoPage event={event} />;
  }

  // Pass raw image_url from DB (dbEventToEventData already includes it)
  return <CheckoutForm event={event} refCode={refCode} partnerCode={partnerCode} />;
}

/* ── Evento concluso ── */
function EventConclusoPage({ event }: { event: EventData }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-[#fdf9f9]">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">

          {event.image_url && (
            <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden mb-10 shadow-md mx-auto">
              <Image
                src={event.image_url}
                alt={event.title}
                fill
                className="object-cover opacity-60 grayscale"
                sizes="(max-width:768px) 100vw, 672px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 text-left">
                <span className="inline-block text-[8px] tracking-[0.4em] bg-[#7a4a4a]/80 text-[#f5e8e8] px-3 py-1 rounded-full mb-2">
                  EVENTO CONCLUSO
                </span>
                <h1
                  className="text-2xl sm:text-3xl font-light text-white leading-snug"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {event.title}
                </h1>
              </div>
            </div>
          )}

          {!event.image_url && (
            <div className="mb-8">
              <span className="inline-block text-[8px] tracking-[0.4em] bg-[#eddada] text-[#7a4a4a] px-3 py-1.5 rounded-full mb-6">
                EVENTO CONCLUSO
              </span>
              <h1
                className="text-3xl sm:text-4xl font-light text-[#1a0505] mb-4"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {event.title}
              </h1>
            </div>
          )}

          <p
            className="text-xl text-[#7a4a4a] mb-3"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Questo evento è già concluso.
          </p>
          <p
            className="text-sm text-[#7a4a4a]/70 mb-8"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Le iscrizioni non sono più disponibili.
          </p>

          <div className="flex items-center justify-center gap-6 text-sm text-[#7a4a4a]/70 mb-10">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} className="text-[#731515]/50" />
              {event.day} {event.month} {event.year}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-[#731515]/50" />
              {event.locationFull}
            </span>
          </div>

          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#731515] text-white text-[10px] tracking-[0.35em] hover:bg-[#9b2323] transition-colors rounded-lg"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            SCOPRI GLI EVENTI IN PROGRAMMA →
          </Link>
        </div>
      </main>
    </>
  );
}
