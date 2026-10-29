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
  className = '',
}: {
  source: VideoCardSource;
  priority?: boolean;
  aspect?: keyof typeof ASPECT;
  rounded?: string;
  /** Quanto sara' larga davvero: serve a non scaricare una foto da 2000px per una scheda da 140. */
  sizes?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    if (priority || reduce) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, reduce]);

  // Pause whatever is off screen so a row of reels costs one decode, not six.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

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
     rispondere invece che caricarsi. `group/fila` ce l'ha la
     striscia (vedi `Marquee`); dove non c'e', queste regole non si
     applicano e la scheda sta ferma come sempre. */
  const selezione =
    'transition-[opacity,filter,box-shadow] duration-200 ease-out ' +
    'group-hover/fila:opacity-40 group-hover/fila:saturate-[0.8] ' +
    'hover:!opacity-100 hover:!saturate-100';

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
