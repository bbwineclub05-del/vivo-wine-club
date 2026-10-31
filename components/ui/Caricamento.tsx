/**
 * Il logo che si riempie, al posto della rotella.
 *
 * Una rotella che gira e' il disegno di un'attesa qualunque: la stessa
 * su ogni sito, e non dice niente di chi la mostra. Qui l'attesa e' il
 * logo che si riempie dal basso, come un bicchiere: la forma spenta
 * resta sempre visibile, e il colore pieno sale dentro di essa.
 *
 * E' una maschera, non un'immagine: dentro la sagoma del logo stanno
 * due strati di `currentColor`, uno appena accennato e uno pieno che
 * cresce in altezza. Cosi' funziona sul fondo chiaro e su quello
 * scuro senza due versioni, basta il colore del testo intorno, e si
 * puo' tingere di rosso dove serve scrivendo `text-accent`.
 *
 * Il riempimento non arriva mai al bordo di netto: si ferma poco
 * sopra e riparte, perche' un'attesa che si completa e poi ricomincia
 * da zero sembra un errore, mentre un livello che oscilla sembra
 * qualcosa che sta lavorando.
 *
 * Con il movimento ridotto non si muove niente: resta il logo a mezza
 * intensita', che e' comunque un'attesa leggibile.
 */
export function Caricamento({
  dimensione = 96,
  etichetta,
  className = '',
}: {
  /** La larghezza in pixel. Sotto i 40 il logo non si legge piu': li' va bene una rotella. */
  dimensione?: number;
  /** Cosa sta succedendo, per chi usa un lettore di schermo e sotto al logo se c'e' spazio. */
  etichetta?: string;
  className?: string;
}) {
  const maschera = {
    WebkitMaskImage: 'url(/vivo-maschera.png)',
    maskImage: 'url(/vivo-maschera.png)',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
  } as const;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex flex-col items-center gap-3 ${className}`}
    >
      <div
        className="relative"
        style={{ width: dimensione, height: Math.round((dimensione * 243) / 512) }}
      >
        {/* La sagoma spenta: c'e' sempre, ed e' quella che si riempie. */}
        <div className="absolute inset-0 opacity-[0.16]" style={{ ...maschera, background: 'currentColor' }} />

        {/* Il livello che sale. L'altezza la muove l'animazione. */}
        <div className="absolute inset-0 overflow-hidden" style={maschera}>
          <div className="vivo-riempie absolute inset-x-0 bottom-0 bg-current" />
        </div>
      </div>

      {/* L'etichetta scritta vale anche per chi ascolta: ripeterla
          nascosta la farebbe leggere due volte. Quando non c'e', una
          parola nascosta serve comunque, altrimenti il lettore di
          schermo annuncia un riquadro vuoto. */}
      {etichetta
        ? <p className="text-fine text-on-paper-muted">{etichetta}</p>
        : <span className="sr-only">Caricamento</span>}
    </div>
  );
}
