'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * La fila che scorre da sola, e che si puo' anche spingere a mano.
 *
 * Prima era un'animazione CSS su una `transform`: scorreva bene, ma
 * era un disegno che si muove, non una fila. Non si poteva fermare,
 * non si poteva tornare indietro a guardare una scheda gia' passata,
 * e su un telefono il dito sopra non faceva niente.
 *
 * Adesso scorre il contenitore, non il contenuto: la barra e' una
 * zona scorrevole vera, quindi il dito la trascina e la rotella la
 * sposta, e un `requestAnimationFrame` la fa avanzare da sola quando
 * nessuno la tocca. Il nastro e' doppio: arrivati a meta' si torna
 * indietro di meta' larghezza, e il salto cade su una copia
 * identica, quindi non si vede.
 *
 * Perche' il giro funzioni, meta' nastro deve essere piu' largo
 * della finestra. Con sette loghi su uno schermo grande non lo era:
 * la fila arrivava in fondo, il browser la teneva li' e sembrava
 * inceppata, mentre quella al contrario girava lo stesso perche'
 * partiva dal fondo. Per questo il contenuto si ripete finche' non
 * basta: lo misuriamo appena la pagina e' in piedi.
 *
 * Il mouse sopra non la ferma: una fila che inchioda mentre il
 * puntatore la attraversa per arrivare altrove sembra inceppata, e
 * le schede si possono aprire lo stesso, al volo. Si ferma solo
 * finche' un dito o il mouse la stanno trascinando, e riparte
 * appena vengono lasciati.
 *
 * Con `guidabile={false}` invece non si ferma e non si trascina: e'
 * il caso dei loghi degli sponsor, dove non c'e' niente da scegliere
 * e una fila che inchioda perche' il mouse le passa sopra per
 * arrivare al footer sembra inceppata.
 *
 * Col dito la si trascina da sola, e' il browser a farlo. Col mouse
 * no: su una zona scorrevole il mouse non trascina niente, quindi
 * quel pezzo lo facciamo noi. Con un'accortezza: se il dito o il
 * mouse si sono mossi davvero, il clic che segue non deve aprire la
 * scheda che si e' trascinata via.
 */
export function Marquee({
  children,
  speed = 42,
  reverse = false,
  guidabile = true,
  className = '',
}: {
  children: ReactNode;
  /** Secondi per un giro intero. Piu' alto, piu' calmo. */
  speed?: number;
  /** Verso opposto: due file che si incrociano si leggono come una cosa sola. */
  reverse?: boolean;
  /** Spento: scorre e basta, non si ferma e non si trascina. */
  guidabile?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const meta1 = useRef<HTMLSpanElement>(null);
  const [copie, setCopie] = useState(1);

  /* Quante volte ripetere il contenuto perche' meta' nastro copra
     almeno una volta e mezza la finestra. Si misura prima che il
     browser disegni, cosi' non si vede la fila allargarsi. */
  useLayoutEffect(() => {
    const el = box.current;
    const mezzo = meta1.current;
    if (!el || !mezzo) return;
    const larghezzaUna = mezzo.scrollWidth / copie;
    if (larghezzaUna <= 0) return;
    const servono = Math.min(8, Math.max(1, Math.ceil((el.clientWidth * 1.5) / larghezzaUna)));
    if (servono !== copie) setCopie(servono);
  }, [copie, children]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let fermo = 0;      // quante cose stanno trattenendo la fila
    let ultimo = 0;
    let frame = 0;

    /* La meta' del nastro si misura una volta, non a ogni fotogramma:
       leggere `scrollWidth` costringe il browser a ricalcolare il
       layout, e farlo sessanta volte al secondo mentre dodici video
       vanno e' esattamente il modo di far scattare la fila. Si
       rimisura solo quando qualcosa cambia davvero di dimensione. */
    let meta = el.scrollWidth / 2;
    const ro = new ResizeObserver(() => { meta = el.scrollWidth / 2; });
    ro.observe(el);
    for (const figlio of Array.from(el.children)) ro.observe(figlio);

    /* Dove siamo, tenuto qui e non chiesto al browser.
     *
     * Prima la posizione si rileggeva da `scrollLeft` a ogni
     * fotogramma. Funziona finche' il passo e' almeno un pixel — e su
     * un computer lo e'. Su un telefono no: il nastro e' corto, quindi
     * il passo vale un quarto di pixel, e Safari conserva `scrollLeft`
     * come numero intero. Scrivi 0,26 e rileggi 0: la fila riparte
     * ogni volta da dove era, e resta ferma. Andando all'indietro
     * invece l'arrotondamento cade dall'altra parte e la fila si
     * muove, a scatti di un pixel — ecco perche' delle due file degli
     * sponsor se ne inchiodava una sola, e solo sul telefono.
     *
     * Tenendo il conto noi, i quarti di pixel si sommano e dopo
     * quattro fotogrammi il pixel c'e'. */
    let dove = reverse ? meta : 0;
    el.scrollLeft = dove;

    function passo(ora: number) {
      frame = requestAnimationFrame(passo);
      const dt = ultimo ? Math.min(ora - ultimo, 64) : 0; // dopo un blocco non salta avanti
      ultimo = ora;
      if (!el || fermo > 0 || dt === 0 || meta <= 0) return;

      dove += (meta / speed) * (dt / 1000) * (reverse ? -1 : 1);
      // Il giro: la meta' puo' essere cambiata di misura mentre
      // scorrevamo, quindi si riporta dentro, non si sottrae e basta.
      dove = ((dove % meta) + meta) % meta;
      el.scrollLeft = dove;
    }

    /* Il ciclo gira solo quando la fila e' dalle parti dello schermo.
       Prima andava sempre: tre file che scrivono `scrollLeft` sessanta
       volte al secondo, anche quando la pagina e' ferma tremila pixel
       piu' in giu' e non le guarda nessuno. Ogni scrittura e' un
       ricalcolo di impaginazione che il browser deve fare comunque. */
    let acceso = false;
    function accendi() {
      if (acceso) return;
      acceso = true;
      ultimo = 0;   // riparte senza saltare in avanti
      frame = requestAnimationFrame(passo);
    }
    function spegni() {
      if (!acceso) return;
      acceso = false;
      cancelAnimationFrame(frame);
    }
    const inVista = new IntersectionObserver(
      ([v]) => (v.isIntersecting ? accendi() : spegni()),
      { rootMargin: '200px' },
    );
    inVista.observe(el);

    /* Trascinamento col mouse. Soglia di quattro pixel: sotto, e'
       un clic con la mano poco ferma, non una trascinata. */
    let partenzaX = 0;
    let partenzaScroll = 0;
    let giu = false;
    let trascinato = false;

    function premuto(e: PointerEvent) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      giu = true;
      trascinato = false;
      partenzaX = e.clientX;
      partenzaScroll = el!.scrollLeft;
    }
    function mosso(e: PointerEvent) {
      if (!giu) return;
      const dx = e.clientX - partenzaX;
      if (!trascinato && Math.abs(dx) < 4) return;
      trascinato = true;
      el!.scrollLeft = partenzaScroll - dx;
    }
    function mollato() {
      if (!giu) return;
      giu = false;
      dove = el!.scrollLeft;
      // `trascinato` resta vero finche' il clic non e' passato.
      setTimeout(() => { trascinato = false; }, 0);
    }
    function clicDopoTrascinata(e: MouseEvent) {
      if (trascinato) { e.preventDefault(); e.stopPropagation(); }
    }

    /* Si trattiene solo mentre qualcuno la sta spingendo: il mouse
       che passa sopra non la ferma piu'. */
    const trattieni = () => { fermo += 1; };
    const lascia = () => {
      fermo = Math.max(0, fermo - 1);
      // Col dito ha scorso il browser, non noi: riallinea il conto.
      if (fermo === 0 && el) dove = el.scrollLeft;
    };

    if (!guidabile) {
      return () => { spegni(); inVista.disconnect(); ro.disconnect(); };
    }

    el.addEventListener('pointerdown', trattieni);
    el.addEventListener('pointerdown', premuto);
    window.addEventListener('pointermove', mosso);
    window.addEventListener('pointerup', mollato);
    el.addEventListener('click', clicDopoTrascinata, true);
    el.addEventListener('touchstart', trattieni, { passive: true });
    window.addEventListener('pointerup', lascia);
    window.addEventListener('touchend', lascia);

    return () => {
      spegni();
      inVista.disconnect();
      ro.disconnect();
      el.removeEventListener('pointerdown', trattieni);
      el.removeEventListener('pointerdown', premuto);
      window.removeEventListener('pointermove', mosso);
      window.removeEventListener('pointerup', mollato);
      el.removeEventListener('click', clicDopoTrascinata, true);
      el.removeEventListener('touchstart', trattieni);
      window.removeEventListener('pointerup', lascia);
      window.removeEventListener('touchend', lascia);
    };
  }, [speed, reverse, guidabile, copie]);

  return (
    <div
      ref={box}
      // Le clip dentro si caricano guardando questa, non la finestra:
      // una scheda ferma fuori dal bordo destro non incrocia mai lo
      // schermo, e senza questo riferimento non partirebbe mai.
      data-fila=""
      className={`group/fila relative flex select-none overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        guidabile
          ? 'cursor-grab touch-pan-x overflow-x-auto overscroll-x-contain active:cursor-grabbing'
          : 'overflow-x-hidden'
      } ${className}`}
      // La sfumatura dice all'occhio che la fila continua oltre il
      // bordo, senza disegnare una linea di taglio.
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
      }}
    >
      <div className="flex w-max shrink-0">
        {/* Due meta' identiche: tornando indietro di meta' larghezza
            si finisce esattamente dove si era partiti. Dentro ogni
            meta' il contenuto si ripete quanto serve a coprire la
            finestra. */}
        <span ref={meta1} className="flex shrink-0 items-center gap-12 pr-12">
          {Array.from({ length: copie }, (_, i) => (
            <span key={i} className="flex shrink-0 items-center gap-12 pr-12">
              {children}
            </span>
          ))}
        </span>
        {/* La copia e' nascosta agli screen reader, e `inert` la toglie
            anche al tab: un link dentro una cosa nascosta sarebbe una
            tappa invisibile nel giro della tastiera. */}
        <span aria-hidden="true" inert className="flex shrink-0 items-center gap-12 pr-12">
          {Array.from({ length: copie }, (_, i) => (
            <span key={i} className="flex shrink-0 items-center gap-12 pr-12">
              {children}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
