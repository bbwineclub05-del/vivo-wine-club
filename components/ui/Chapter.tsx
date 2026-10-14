'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The chapter heading: one or two words set as large as the viewport can
 * carry. These are the page's structure, not decoration. Alternating the
 * ground under consecutive chapters is what gives the page its rhythm.
 *
 * A single letter can be tinted, once per chapter. The tint is picked
 * from the ground: bordeaux on paper, rose on ink. Rose on paper is
 * about 1.6:1 and fails even the large-text floor.
 */
export function Chapter({
  lines,
  accent,
  align = 'center',
  size = 'chapter',
  as: Tag = 'h2',
  className = '',
}: {
  lines: [string] | [string, string];
  /** Tint one letter: `[lineIndex, letterIndex]`. */
  accent?: [number, number];
  align?: 'left' | 'center';
  /** `chapter` is the full-bleed divider; `statement` fits inside a band. */
  size?: 'chapter' | 'statement';
  as?: 'h1' | 'h2';
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <Tag
      className={`ds-display ${size === 'chapter' ? 'text-chapter' : 'text-statement'} ${
        align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    >
      {lines.map((line, i) => (
        <span key={i} className="ds-clip">
          <motion.span
            className="block"
            initial={reduce ? false : { y: '42%', opacity: 0 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{
              duration: 0.95,
              delay: i * 0.07,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {accent && accent[0] === i ? (
              <>
                {line.slice(0, accent[1])}
                <span className="ds-accent-letter">{line.charAt(accent[1])}</span>
                {line.slice(accent[1] + 1)}
              </>
            ) : (
              line
            )}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * A full-width sentence set large. Used for the manifesto moment, where
 * the copy itself is the composition.
 */
export function Statement({
  children,
  align = 'center',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.p
      className={`ds-display text-statement text-balance ${
        align === 'center' ? 'text-center mx-auto' : 'text-left'
      } ${className}`}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.p>
  );
}
