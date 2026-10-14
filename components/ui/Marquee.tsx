'use client';

import type { ReactNode } from 'react';

/**
 * One marquee per page, at most. It earns its place where the content is
 * a breadth signal rather than a list to read item by item: the cities,
 * the partner estates.
 *
 * The track is duplicated once and translated by exactly -50%, so the
 * loop is seamless regardless of content width. Reduced motion stops it
 * and lets the row scroll by hand instead.
 */
export function Marquee({
  children,
  speed = 42,
  className = '',
}: {
  children: ReactNode;
  /** Seconds for one full pass. Longer is calmer. */
  speed?: number;
  className?: string;
}) {
  return (
    <div
      className={`group relative flex overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-safe:overflow-hidden ${className}`}
      // The fade tells the eye the row continues past the edge, without
      // drawing a hard crop line.
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
      }}
    >
      <div
        className="ds-marquee__track flex w-max shrink-0 motion-safe:animate-[ds-marquee_var(--ds-marquee-speed)_linear_infinite] motion-safe:group-hover:[animation-play-state:paused]"
        style={{ '--ds-marquee-speed': `${speed}s` } as React.CSSProperties}
      >
        {/* Two identical halves, so translating the track by exactly
            -50% lands the copy where the original started. */}
        <span className="flex shrink-0 items-center gap-12 pr-12">{children}</span>
        <span aria-hidden="true" className="flex shrink-0 items-center gap-12 pr-12">
          {children}
        </span>
      </div>
    </div>
  );
}
