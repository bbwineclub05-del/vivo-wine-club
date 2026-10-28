'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';

import type { CaseTappa } from '@/lib/case-studies';

/**
 * La linea del tempo di un caso studio.
 *
 * Scende dritta sulla sinistra, con un pallino per ogni tappa: si
 * legge come un racconto, non come una tabella. Le foto invece non
 * stanno in riga: cambiano larghezza, lato e inclinazione a ogni
 * passo, perche' una griglia perfetta fa sembrare tutto un catalogo
 * e questa e' una serata.
 *
 * Le inclinazioni sono scritte, non sorteggiate: un numero a caso
 * darebbe al server una pagina e al browser un'altra.
 */

const POSE = [
  { rot: -2.0, largh: 'sm:w-[76%]',           lato: '' },
  { rot: 2.4,  largh: 'w-[82%] sm:w-[48%]',   lato: 'ml-auto' },
  { rot: -1.4, largh: 'sm:w-[66%]',           lato: '' },
  { rot: 2.0,  largh: 'w-[78%] sm:w-[44%]',   lato: 'ml-auto' },
  { rot: -2.4, largh: 'sm:w-[70%]',           lato: '' },
];

export function CaseTimeline({ tappe }: { tappe: CaseTappa[] }) {
  const reduce = useReducedMotion();

  return (
    <ol className="relative flex flex-col gap-16 border-l border-rule-paper pl-6 sm:gap-24 sm:pl-10">
      {tappe.map((t, i) => {
        const pose = POSE[i % POSE.length];

        return (
          <motion.li
            key={`${t.titolo}-${i}`}
            className="relative"
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Il pallino sulla linea. */}
            <span
              aria-hidden
              className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent sm:-left-[47px]"
            />

            {t.occhiello && (
              <p className="text-fine font-medium uppercase tracking-[0.16em] text-accent-soft">
                {t.occhiello}
              </p>
            )}

            <h3 className="ds-display mt-2 max-w-[20ch] text-title leading-[1.05]">{t.titolo}</h3>

            <p className="mt-4 max-w-[58ch] text-lead text-on-paper-muted">{t.corpo}</p>

            {t.numeri && t.numeri.length > 0 && (
              <dl className="mt-7 flex flex-wrap gap-x-12 gap-y-5">
                {t.numeri.map((n) => (
                  <div key={n.etichetta}>
                    <dd className="ds-display ds-numeric text-[clamp(1.9rem,4vw,2.6rem)] leading-none text-accent">
                      {n.valore}
                    </dd>
                    <dt className="mt-2 text-fine text-on-paper-muted">{n.etichetta}</dt>
                  </div>
                ))}
              </dl>
            )}

            {t.foto && (
              <motion.figure
                className={`mt-9 ${pose.largh} ${pose.lato}`}
                initial={reduce ? false : { opacity: 0, scale: 0.96, rotate: pose.rot * 2 }}
                whileInView={reduce ? { rotate: 0 } : { opacity: 1, scale: 1, rotate: pose.rot }}
                viewport={{ once: true, amount: 0.2 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 190, damping: 18, delay: 0.1 }
                }
              >
                <div
                  className={`relative overflow-hidden rounded-2xl bg-ink-soft shadow-[0_22px_50px_-30px_rgba(26,5,5,0.6)] ${
                    t.verso === 'alto' ? 'aspect-[4/5]' : 'aspect-[16/10]'
                  }`}
                >
                  <Image
                    src={t.foto}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 90vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </motion.figure>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
