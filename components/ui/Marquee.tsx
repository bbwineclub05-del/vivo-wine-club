'use client';

import { useEffect, useRef, type ReactNode } from 'react';

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

    // Nel verso contrario si parte da meta': andando all'indietro da
    // zero si finirebbe subito contro il bordo.
    if (reverse) el.scrollLeft = meta;

    function passo(ora: number) {
      frame = requestAnimationFrame(passo);
      const dt = ultimo ? Math.min(ora - ultimo, 64) : 0; // dopo un blocco non salta avanti
      ultimo = ora;
      if (!el || fermo > 0 || dt === 0 || meta <= 0) return;

      const px = (meta / speed) * (dt / 1000);
      let x = el.scrollLeft + (reverse ? -px : px);
      if (x >= meta) x -= meta;
      if (x <= 0) x += meta;
      el.scrollLeft = x;
    }
    frame = requestAnimationFrame(passo);

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
      // `trascinato` resta vero finche' il clic non e' passato.
      setTimeout(() => { trascinato = false; }, 0);
    }
    function clicDopoTrascinata(e: MouseEvent) {
      if (trascinato) { e.preventDefault(); e.stopPropagation(); }
    }

    /* Si trattiene solo mentre qualcuno la sta spingendo: il mouse
       che passa sopra non la ferma piu'. */
    const trattieni = () => { fermo += 1; };
    const lascia = () => { fermo = Math.max(0, fermo - 1); };

    if (!guidabile) {
      return () => { cancelAnimationFrame(frame); ro.disconnect(); };
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
      cancelAnimationFrame(frame);
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
  }, [speed, reverse, guidabile]);

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
            si finisce esattamente dove si era partiti. */}
        <span className="flex shrink-0 items-center gap-12 pr-12">{children}</span>
        {/* La copia e' nascosta agli screen reader, e `inert` la toglie
            anche al tab: un link dentro una cosa nascosta sarebbe una
            tappa invisibile nel giro della tastiera. */}
        <span aria-hidden="true" inert className="flex shrink-0 items-center gap-12 pr-12">
          {children}
        </span>
      </div>
    </div>
  );
}
