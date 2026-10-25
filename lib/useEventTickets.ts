'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * I biglietti venduti per un evento, con il check-in.
 *
 * Stava dentro lo scanner, e lo scanner si apre solo per gli eventi
 * futuri: di una serata passata non c'era modo di sapere chi avesse
 * comprato. Ora il dato vive qui e lo leggono in due — lo scanner
 * sulla porta e la scheda "Biglietti" dell'evento — senza che
 * nessuno dei due debba sapere come si parla al database.
 */

export interface Ticket {
  order_id: string;
  qr_code: string | null;
  name: string;
  email: string;
  phone: string | null;
  checked_in: boolean | null;
  scanned_at: string | null;
  scanned_by: string | null;
}

export function useEventTickets(eventSlug: string, accessToken: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* Niente `setLoading(true)` prima della chiamata: al montaggio
     sarebbe uno stato cambiato dentro a un effetto in modo sincrono,
     e `loading` parte gia' da vero. Il giro a vuoto lo fa solo chi
     preme "Aggiorna". */
  const carica = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets?event_id=${eventSlug}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const j = await res.json();
      setTickets(Array.isArray(j.tickets) ? j.tickets : []);
    } catch (err) {
      console.error('[biglietti]', err);
    } finally {
      setLoading(false);
    }
  }, [eventSlug, accessToken]);

  const reload = useCallback(() => {
    setLoading(true);
    carica();
  }, [carica]);

  useEffect(() => {
    carica();
  }, [carica]);

  /* Due telefoni sulla stessa porta: ognuno vede i check-in dell'altro. */
  useEffect(() => {
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel(`tickets:event_id:${eventSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `event_id=eq.${eventSlug}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const agg = payload.new as Ticket;
            setTickets((prev) => prev.map((t) => (t.order_id === agg.order_id ? { ...t, ...agg } : t)));
          } else {
            carica();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventSlug, accessToken, carica]);

  const toggle = useCallback(
    async (ticket: Ticket) => {
      if (busyId) return;
      const nuovo = !ticket.checked_in;
      setBusyId(ticket.order_id);

      setTickets((prev) =>
        prev.map((t) =>
          t.order_id === ticket.order_id
            ? {
                ...t,
                checked_in: nuovo,
                scanned_at: nuovo ? new Date().toISOString() : null,
                scanned_by: nuovo ? 'manuale' : null,
              }
            : t,
        ),
      );

      const { error } = await supabase
        .from('tickets')
        .update({
          checked_in: nuovo,
          scanned_at: nuovo ? new Date().toISOString() : null,
          scanned_by: nuovo ? 'manuale' : null,
        })
        .eq('order_id', ticket.order_id);

      if (error) {
        setTickets((prev) => prev.map((t) => (t.order_id === ticket.order_id ? { ...t, ...ticket } : t)));
      }
      setBusyId(null);
    },
    [busyId],
  );

  const presenti = tickets.filter((t) => t.checked_in).length;

  return { tickets, loading, busyId, reload, toggle, presenti, totale: tickets.length };
}
