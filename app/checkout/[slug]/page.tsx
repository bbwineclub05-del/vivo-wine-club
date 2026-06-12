import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
    if (data) event = dbEventToEventData(data as DbEvent);
  } catch {/* fall through */}

  if (!event) notFound();

  // Pass raw image_url from DB (dbEventToEventData already includes it)
  return <CheckoutForm event={event} />;
}
