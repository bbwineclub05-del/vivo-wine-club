'use client';

import { EventTicketList } from '@/components/EventTicketList';
import { useEventTickets } from '@/lib/useEventTickets';

/**
 * La scheda "Biglietti" di un evento.
 *
 * Esiste perche' chi ha comprato era visibile solo dentro lo scanner,
 * e lo scanner si apre solo per gli eventi futuri: di una serata
 * passata non si sapeva piu' chi fosse venuto. Qui si vede sempre, e
 * per gli eventi conclusi il check-in diventa di sola lettura: e'
 * storia, non una casella da spuntare.
 */
export default function EventTicketsPanel({
  event,
  accessToken,
  isPast,
}: {
  event: { slug: string };
  accessToken: string;
  isPast: boolean;
}) {
  const { tickets, loading, busyId, reload, toggle } = useEventTickets(event.slug, accessToken);

  return (
    <div className="ds px-4 py-4 sm:px-6">
      <EventTicketList
        tickets={tickets}
        loading={loading}
        busyId={busyId}
        onToggle={toggle}
        onReload={reload}
        readOnly={isPast}
      />
    </div>
  );
}
