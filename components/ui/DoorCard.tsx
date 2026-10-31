'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * One of the entries on the home page. Deliberately not a grid of equal
 * icon-plus-heading tiles: each door states a destination and a promise,
 * and the row is sized so the doors are not interchangeable.
 */
export function DoorCard({
  href,
  title,
  body,
  cta,
  ground = 'soft',
  index = 0,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
  ground?: 'soft' | 'ink' | 'accent';
  index?: number;
}) {
  const reduce = useReducedMotion();

  const skin =
    ground === 'ink'
      ? 'bg-ink text-on-ink ds-on-ink'
      : ground === 'accent'
        ? 'bg-accent text-paper'
        : 'bg-paper-soft text-on-paper';

  const muted =
    ground === 'soft' ? 'text-on-paper-muted' : 'text-current/70';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={href}
        className={`group flex h-full min-h-[300px] flex-col justify-between rounded-2xl p-8 md:p-9 ${skin}
          transition-transform duration-300 ease-out hover:-translate-y-1`}
      >
        <div>
          <h3 className="ds-display text-title">{title}</h3>
          <p className={`mt-4 max-w-[34ch] text-body ${muted}`}>{body}</p>
        </div>

        <span className="mt-10 inline-flex min-h-[48px] items-center gap-3 text-fine font-medium">
          {cta}
          <ArrowRight
            size={16}
            strokeWidth={1.75}
            className="transition-transform duration-300 ease-out group-hover:translate-x-1.5"
          />
        </span>
      </Link>
    </motion.div>
  );
}
