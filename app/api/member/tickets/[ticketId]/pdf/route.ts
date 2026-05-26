import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, type DbEvent } from '@/lib/events';
import { generateTicketPdf } from '@/lib/ticket-pdf';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { ticketId } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    // 1. Fetch ticket
    const { data: ticket, error: ticketErr } = await db
      .from('tickets')
      .select('*')
      .eq('order_id', ticketId)
      .maybeSingle();

    if (ticketErr) {
      return NextResponse.json({ error: ticketErr.message }, { status: 500 });
    }
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Security: only the owner can download
    if (ticket.email !== auth.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch event
    const { data: eventRow } = await db
      .from('events')
      .select('*')
      .eq('slug', ticket.event_id)
      .maybeSingle();

    if (!eventRow) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const event = dbEventToEventData(eventRow as DbEvent);

    // 3. Parse name
    const nameParts  = (ticket.name as string).split(' ');
    const firstName  = nameParts[0] ?? '';
    const lastName   = nameParts.slice(1).join(' ');

    // 4. Determine ticketNum and totalTickets
    // order_id format: VWC-{timestamp}-{random}-{n}
    const ticketNum = parseInt(ticketId.split('-').at(-1)!) || 1;

    const { data: siblings } = await db
      .from('tickets')
      .select('order_id')
      .eq('event_id', ticket.event_id)
      .eq('email', ticket.email);

    const totalTickets = (siblings ?? []).length || 1;

    // 5. Generate PDF
    const pdfBytes = await generateTicketPdf({
      event,
      firstName,
      lastName,
      email:  ticket.email,
      total:  event.price,
      ticketId,
      ticketNum,
      totalTickets,
    });

    // 6. Return PDF response
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="vivo-ticket-${event.slug}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[/api/member/tickets/[ticketId]/pdf] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
