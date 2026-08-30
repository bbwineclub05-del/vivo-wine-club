import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EventsHub from '@/components/EventsHub';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, type EventData, type DbEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  let events: EventData[] = [];
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
      events = (data as DbEvent[]).map(dbEventToEventData);
    }
  } catch {/* fall through with empty events */}

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <EventsHub events={events} />
      </main>
      <Footer />
    </>
  );
}
