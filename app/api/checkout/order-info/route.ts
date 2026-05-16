import { NextResponse } from 'next/server';
import { dbEventToEventData, type DbEvent } from '@/lib/events';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/checkout/order-info?order_id=VWC-xxx
 *
 * Read-only lookup used by the success page for free-event orders.
 * Finds the first ticket for the order (`${order_id}-1`), then fetches
 * the event details so the success page can display them.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    // Tickets are stored as `${orderId}-1`, `${orderId}-2`, … — look up the first.
    const { data: ticket } = await db
      .from('tickets')
      .select('event_id, name')
      .eq('order_id', `${orderId}-1`)
      .maybeSingle();

    if (!ticket) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: eventRow } = await db
      .from('events')
      .select('*')
      .eq('slug', ticket.event_id)
      .single();

    if (!eventRow) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = dbEventToEventData(eventRow as DbEvent);

    // Count all tickets for this order (order_id starts with orderId-)
    const { count } = await db
      .from('tickets')
      .select('order_id', { count: 'exact', head: true })
      .like('order_id', `${orderId}-%`);

    return NextResponse.json({
      ok:   true,
      type: 'event',
      event: {
        title:        event.title,
        month:        event.month,
        day:          event.day,
        year:         event.year,
        time:         event.time ?? null,
        locationFull: event.locationFull,
        qty:          count ?? 1,
      },
    });
  } catch (err) {
    console.error('[order-info] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
