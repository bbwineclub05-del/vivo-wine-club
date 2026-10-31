import type { ReactNode } from 'react';

/**
 * Le righe che si aprono.
 *
 * Servono dove c'e' un elenco che la gente scorre cercando sé stessa:
 * il titolo e' gia' la risposta («fate anche gli eventi in cantina?»)
 * e il dettaglio lo vuole solo chi ha detto si'. Non vanno usate per
 * una sequenza da leggere in ordine, né per la frase che deve
 * convincere: quello che sta dietro un piu' lo legge una persona su
 * cinque.
 *
 * Sono `details` e `summary`, i tag che il browser conosce gia'.
 * Niente stato, niente JavaScript: funzionano col tasto invio, le
 * legge uno screen reader, e la ricerca dentro la pagina (ctrl+F)
 * trova anche il testo chiuso, che con un div nascosto non succede.
 */

export interface AccordionItem {
  id: string;
  titolo: string;
  corpo: ReactNode;
}

export function Accordion({
  items,
  ground = 'paper',
}: {
  items: AccordionItem[];
  ground?: 'paper' | 'ink';
}) {
  const scuro = ground === 'ink';
  const bordo = scuro ? 'border-rule-ink' : 'border-rule-paper';
  const smorzato = scuro ? 'text-on-ink-muted' : 'text-on-paper-muted';

  return (
    <ul className={`border-t ${bordo}`}>
      {items.map((v) => (
        <li key={v.id} className={`border-b ${bordo}`}>
          <details className="group">
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden"
            >
              <span className="ds-display text-subtitle transition-colors group-open:text-accent">
                {v.titolo}
              </span>

              {/* Il piu' che diventa meno: una barra sola che ruota. */}
              <span
                aria-hidden
                className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full border ${bordo} transition-colors group-hover:border-accent/50`}
              >
                <span className="absolute h-px w-3.5 bg-current" />
                <span className="absolute h-3.5 w-px bg-current transition-transform duration-300 ease-out group-open:rotate-90 group-open:scale-y-0" />
              </span>
            </summary>

            <div className={`max-w-[62ch] pb-7 pr-12 text-body ${smorzato}`}>{v.corpo}</div>
          </details>
        </li>
      ))}
    </ul>
  );
}
