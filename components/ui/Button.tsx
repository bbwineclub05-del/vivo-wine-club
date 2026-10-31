import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * The single button shape for the redesign: a full pill, in one of three
 * weights. Shape is locked here so no surface invents its own radius.
 *
 * Every variant keeps >= 4.5:1 on its own ground and >= 48px of touch
 * height at every size, including `sm`.
 */
type Variant = 'accent' | 'paper' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  // Bordeaux pill. The default call to action on the light ground.
  accent:
    'bg-accent text-paper hover:bg-accent-lift ' +
    'shadow-[0_1px_2px_rgba(26,5,5,0.16),0_8px_24px_-12px_rgba(115,21,21,0.5)]',
  // Inverted pill, for use on the dark ground.
  paper:
    'bg-paper text-ink hover:bg-rose ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.28),0_10px_28px_-14px_rgba(0,0,0,0.6)]',
  // Quiet secondary. Takes its colour from the surrounding text, so it
  // works on either ground without a second variant.
  outline:
    'border border-current/25 hover:border-current/60 bg-transparent',
};

const SIZE: Record<Size, string> = {
  sm: 'min-h-[48px] px-5 text-fine',
  md: 'min-h-[52px] px-7 text-body',
  lg: 'min-h-[60px] px-9 text-subtitle',
};

const BASE =
  'inline-flex items-center justify-center gap-2.5 rounded-full font-medium ' +
  'whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out ' +
  'active:translate-y-px ' +
  'disabled:opacity-45 disabled:pointer-events-none';

interface Common {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'accent',
  size = 'md',
  className = '',
  children,
  ...rest
}: Common & ComponentPropsWithoutRef<'button'>) {
  return (
    <button className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'accent',
  size = 'md',
  className = '',
  children,
  href,
  ...rest
}: Common & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
