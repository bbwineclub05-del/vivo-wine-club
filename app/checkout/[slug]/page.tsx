import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, type EventData, type DbEvent } from '@/lib/events';
import CheckoutForm from './CheckoutForm';

export const dynamic = 'force-dynamic';

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

  return <CheckoutForm event={event} />;
}
