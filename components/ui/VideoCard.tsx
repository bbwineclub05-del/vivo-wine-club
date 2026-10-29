'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { SocialIcon } from '@/components/ui/SocialIcons';
import { useReducedMotion } from 'framer-motion';

export interface VideoCardSource {
  /** Il filmato. Senza, la scheda resta la sola fotografia. */
  src?: string;
  /** First frame, shown until the clip can play and whenever it cannot. */
  poster?: string;
  label?: string;
  /** Dove porta la scheda: il post da cui viene la clip. */
  link?: string;
}

/**
 * A vertical reel card. It only fetches and plays its clip once it is
 * actually on screen, and never on a connection or a preference that
 * says otherwise: with reduced motion, or with no poster-safe fallback,
 * it stays a still image.
 */
const ASPECT = {
  reel: 'aspect-[9/16]',
  wide: 'aspect-[16/9]',
  cinema: 'aspect-[21/9]',
} as const;

export function VideoCard({
  source,
  priority = false,
  aspect = 'reel',
  rounded = 'rounded-2xl',
  sizes,
  continuo = false,
  className = '',
}: {
  source: VideoCardSource;
  priority?: boolean;
  aspect?: keyof typeof ASPECT;
  rounded?: string;
  /** Quanto sara' larga davvero: serve a non scaricare una foto da 2000px per una scheda da 140. */
  sizes?: string;
  /** Dentro una fila che scorre: una volta partito non si ferma piu'. */
  continuo?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    if (priority || reduce) return;
    const el = ref.current;
    if (!el) return;

    /* Dentro una striscia che scorre il riferimento non e' la
       finestra ma la striscia: una scheda parcheggiata oltre il bordo
       destro non incrocia mai lo schermo, quindi non si caricherebbe
       mai e resterebbe una fotografia ferma. Cosi' invece si carica
       poco prima di entrare. */
    const dentroLaFila = el.closest('[data-fila]');
    const root = continuo && dentroLaFila instanceof HTMLElement ? dentroLaFila : null;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root, rootMargin: '320px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, reduce, continuo]);

  /* Fuori dallo schermo si mette in pausa: una fila di clip costa una
     decodifica, non sei.

     Dentro una striscia che scorre pero' no. La scheda esce e rientra
     dal bordo in continuazione, e ogni passaggio sarebbe un
     `pause()` e un `play()`: il video riparte, salta, e si vede. Con
     `continuo` parte quando compare e da li' in poi va avanti. */
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;

    if (continuo) {
      if (visible) void el.play().catch(() => {});
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce, continuo, visible]);

  const figura = (
    <figure
      className={`relative h-full w-full overflow-hidden ${rounded} bg-ink-soft
        transition-transform duration-200 ease-out
        group-hover/scheda:scale-[1.06] group-active/scheda:scale-[1.02]`}
    >
      {source.poster && (
        <Image
          src={source.poster}
          alt=""
          fill
          sizes={sizes ?? (aspect === 'reel' ? '(max-width: 768px) 60vw, 22vw' : '100vw')}
          className="object-cover"
          priority={priority}
        />
      )}

      {!reduce && source.src && (
        <video
          ref={ref}
          muted
          loop
          playsInline
          preload="none"
          poster={source.poster}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        >
          {visible && <source src={source.src} type="video/mp4" />}
        </video>
      )}

      {source.label && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4 pt-10 text-fine font-medium text-on-ink">
          {source.label}
        </figcaption>
      )}
    </figure>
  );

  /* Dentro una fila che scorre, la scheda sotto il puntatore deve
     staccarsi: le altre si smorzano, quella sale e resta piena. La
     sola scala non si vedrebbe, perche' tutto si muove gia'.

     Duecento millisecondi: il tempo in cui una cosa sembra
     rispondere invece che caricarsi. Si muovono solo opacita' e
     scala, che la scheda grafica sa fare da sola: un filtro di
     saturazione su dodici schede le farebbe ridipingere tutte a ogni
     fotogramma, e la fila scatterebbe.

     `group/fila` ce l'ha la striscia (vedi `Marquee`); dove non c'e',
     queste regole non si applicano e la scheda sta ferma come
     sempre. */
  const selezione =
    'transition-[opacity,box-shadow] duration-200 ease-out ' +
    'group-hover/fila:opacity-40 hover:!opacity-100';

  // Senza link resta una scheda da guardare, ma si illumina lo stesso:
  // altrimenti passandoci sopra si spegnerebbe tutta la fila e basta.
  if (!source.link) {
    return (
      <div className={`group/scheda relative ${ASPECT[aspect]} ${selezione} ${className}`}>
        {figura}
      </div>
    );
  }

  // Col link c'e' anche da capire che si apre: il puntatore cambia,
  // il bordo chiaro compare, e il bollino di Instagram si posa
  // nell'angolo.
  return (
    <a
      href={source.link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={source.label ?? 'Guarda il post su Instagram'}
      className={`group/scheda relative block cursor-pointer ${ASPECT[aspect]} ${rounded} ${selezione} ${className}
        ring-0 ring-paper/80 hover:ring-2
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {figura}
      <span
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-2.5 grid h-8 w-8 scale-75 place-items-center rounded-full
          bg-paper text-ink opacity-0 shadow-[0_2px_10px_rgba(26,5,5,0.35)] transition-all duration-200 ease-out
          group-hover/scheda:scale-100 group-hover/scheda:opacity-100
          group-focus-visible/scheda:scale-100 group-focus-visible/scheda:opacity-100"
      >
        <SocialIcon label="Instagram" size={15} />
      </span>
    </a>
  );
}
