'use client';

import { Check, Loader2, RefreshCw } from 'lucide-react';
import { ActionButton, EmptyState } from '@/components/admin/ui';
import type { Ticket } from '@/lib/useEventTickets';

/**
 * L'elenco di chi ha comprato un biglietto.
 *
 * Solo come si vede: i dati e il check-in stanno in
 * `useEventTickets`, perche' questo stesso elenco serve sulla porta
 * dentro lo scanner e dentro la scheda dell'evento, anche a mesi di
 * distanza.
 */

function ora(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function EventTicketList({
  tickets,
  loading,
  busyId,
  onToggle,
  onReload,
  /** Dopo l'evento il check-in non si tocca piu': resta la storia. */
  readOnly = false,
}: {
  tickets: Ticket[];
  loading: boolean;
  busyId: string | null;
  onToggle: (t: Ticket) => void;
  onReload: () => void;
  readOnly?: boolean;
}) {
  const presenti = tickets.filter((t) => t.checked_in).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-fine text-on-paper-muted">
          <span className="ds-numeric text-on-paper">{tickets.length}</span>{' '}
          {tickets.length === 1 ? 'biglietto' : 'biglietti'} ·{' '}
          <span className="ds-numeric text-on-paper">{presenti}</span> entrati
        </p>
        <ActionButton variant="quiet" onClick={onReload}>
          <RefreshCw size={15} strokeWidth={1.8} />
          Aggiorna
        </ActionButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={22} className="animate-spin text-accent/50" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="Nessun biglietto"
          body="Per questo evento non risulta nessun acquisto. Se era un evento a lista, gli iscritti sono nella scheda «Invitati»."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {tickets.map((ticket) => {
            const attesa = busyId === ticket.order_id;
            return (
              <li
                key={ticket.order_id}
                className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                  ticket.checked_in ? 'border-accent/35 bg-accent/5' : 'border-rule-paper'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{ticket.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 truncate text-fine text-on-paper-muted">
                    <span>{ticket.email}</span>
                    {ticket.phone && <span>{ticket.phone}</span>}
                    {ticket.checked_in && ticket.scanned_at && (
                      <span>
                        {ticket.scanned_by === 'manuale' ? 'a mano' : 'scansionato'} alle {ora(ticket.scanned_at)}
                      </span>
                    )}
                  </p>
                </div>

                {readOnly ? (
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
                      ticket.checked_in
                        ? 'border-accent bg-accent text-paper'
                        : 'border-rule-paper text-on-paper-muted/30'
                    }`}
                    aria-label={ticket.checked_in ? 'Era entrato' : 'Non si è presentato'}
                  >
                    <Check size={18} strokeWidth={ticket.checked_in ? 2.5 : 1.6} />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggle(ticket)}
                    disabled={attesa}
                    aria-pressed={!!ticket.checked_in}
                    aria-label={ticket.checked_in ? 'Togli la presenza' : 'Segna come presente'}
                    style={{ touchAction: 'manipulation' }}
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-colors active:scale-95 ${
                      ticket.checked_in
                        ? 'border-accent bg-accent text-paper'
                        : 'border-rule-paper text-on-paper-muted/40 hover:border-accent/50 hover:text-accent'
                    }`}
                  >
                    {attesa ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={20} strokeWidth={ticket.checked_in ? 2.5 : 1.6} />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
