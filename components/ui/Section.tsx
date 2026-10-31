import type { ReactNode } from 'react';

/**
 * Vertical rhythm and ground colour for a page band.
 *
 * `ground` is the page's theme at this point in the scroll. Switching it
 * is a chapter break, not decoration: a band only flips to `ink` when the
 * content under it is a different chapter of the story.
 */
type Ground = 'paper' | 'paper-soft' | 'ink';
type Width = 'text' | 'default' | 'wide' | 'full';

const GROUND: Record<Ground, string> = {
  paper: 'bg-paper text-on-paper',
  'paper-soft': 'bg-paper-soft text-on-paper',
  ink: 'bg-ink text-on-ink ds-on-ink',
};

const WIDTH: Record<Width, string> = {
  // 68ch keeps running text inside the comfortable measure.
  text: 'max-w-[68ch]',
  default: 'max-w-[1180px]',
  wide: 'max-w-[1440px]',
  full: 'max-w-none',
};

export function Section({
  ground = 'paper',
  width = 'default',
  tight = false,
  bleed = false,
  className = '',
  innerClassName = '',
  id,
  children,
}: {
  ground?: Ground;
  width?: Width;
  /** Half the usual band height, for sections that continue the one above. */
  tight?: boolean;
  /** Drop the side gutter, for full-bleed media and chapter type. */
  bleed?: boolean;
  className?: string;
  innerClassName?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`ds relative ${GROUND[ground]} ${tight ? 'py-band-tight' : 'py-band'} ${className}`}
    >
      <div
        className={`${WIDTH[width]} mx-auto ${bleed ? '' : 'px-gutter md:px-10'} ${innerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
