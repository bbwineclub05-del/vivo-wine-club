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
      className={`relative h-full w-full overflow-hidden ${rounded} bg-ink-soft ${
        source.link ? 'transition-transform duration-500 group-hover/scheda:scale-[1.03]' : ''
      }`}
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

  // Senza link resta quello che era: una scheda da guardare.
  if (!source.link) {
    return <div className={`relative ${ASPECT[aspect]} ${className}`}>{figura}</div>;
  }

  // Con il link diventa una cosa da toccare, e si vede: il bollino
  // compare passandoci sopra, e c'e' sempre per chi naviga da
  // tastiera o con uno screen reader.
  return (
    <a
      href={source.link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={source.label ?? 'Guarda il post su Instagram'}
      className={`group/scheda relative block ${ASPECT[aspect]} overflow-hidden ${rounded} ${className}
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {figura}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full
          bg-paper/90 text-ink opacity-0 shadow-sm backdrop-blur transition-opacity duration-300
          group-hover/scheda:opacity-100 group-focus-visible/scheda:opacity-100"
      >
        <SocialIcon label="Instagram" size={15} />
      </span>
    </a>
  );
}
