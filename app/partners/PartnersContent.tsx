'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { Chapter } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import PartnerLogo from '@/components/PartnerLogo';
import EstatesGrid from '@/components/EstatesGrid';
import { linkPartner, PARTNERS, type Partner } from '@/lib/partners';

/**
 * I partner, nel sistema del sito.
 *
 * Prima questa pagina viveva per conto suo: colori scritti a mano,
 * carattere scelto riga per riga, e sotto ogni logo la targhetta
 * «partner of Vivo Wine Club», ripetuta nove volte in una pagina che
 * si chiama Partner. Al suo posto c'e' il dato che serve davvero: se
 * e' una cantina o un locale.
 *
 * Due colonne sul telefono, non una: nove loghi incolonnati sono
 * nove schermate, e un logo non ha bisogno di mezzo schermo per
 * essere riconosciuto.
 */

type Linguetta = 'all' | 'estate';

function Scheda({ partner, index }: { partner: Partner; index: number }) {
  const t = useTranslations('partners');
  const reduce = useReducedMotion();
  const { href, esterno } = linkPartner(partner);

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={href}
        target={esterno ? '_blank' : undefined}
        rel={esterno ? 'noopener noreferrer' : undefined}
        className="group block no-underline transition-transform duration-200 ease-out hover:-translate-y-[3px]"
      >
        <div
          className="relative aspect-square overflow-hidden rounded-2xl border border-rule-paper bg-white
            transition-shadow duration-200 ease-out group-hover:shadow-[0_16px_34px_-18px_rgba(26,5,5,0.5)]"
        >
          <PartnerLogo
            name={partner.name}
            logo={partner.logo}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
          />
        </div>

        <h3 className="mt-4 text-body font-medium transition-colors group-hover:text-accent">
          {partner.name}
        </h3>
        <p className="mt-0.5 text-fine text-on-paper-muted">
          {partner.category === 'cantina' ? t('categoryCantina') : t('categoryLocation')}
        </p>
      </Link>
    </motion.li>
  );
}

export default function PartnersContent() {
  const t = useTranslations('partners');
  const tHub = useTranslations('eventsHub');
  const [linguetta, setLinguetta] = useState<Linguetta>('all');

  const LINGUETTE: { key: Linguetta; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'estate', label: t('filterEstate') },
  ];

  return (
    <main className="ds bg-paper text-on-paper">
      <Section bleed width="full" tight className="pt-band">
        <Chapter as="h1" lines={['Partner']} accent={[0, 0]} />
      </Section>

      <Section className="pt-0">
        <p className="max-w-[56ch] text-lead text-on-paper-muted">{t('subtitle')}</p>

        {/* Le stesse linguette del calendario del Club: una sola
            forma di pulsante in tutto il sito. */}
        <div className="mt-10 flex flex-wrap gap-2.5" role="group">
          {LINGUETTE.map((l) => {
            const attiva = linguetta === l.key;
            return (
              <button
                key={l.key}
                onClick={() => setLinguetta(l.key)}
                aria-pressed={attiva}
                className={`min-h-[48px] rounded-full border px-5 text-fine font-medium transition-colors duration-200 ${
                  attiva
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper text-on-paper hover:border-accent/40'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        {linguetta === 'all' ? (
          <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-8">
            {PARTNERS.map((p, i) => (
              <Scheda key={p.slug} partner={p} index={i} />
            ))}
          </ul>
        ) : (
          /* Le tenute su fondo scuro: e' un capitolo dentro la pagina,
             e il cambio di fondo lo dice meglio di un'etichetta. I
             colori sono quelli del sistema, non piu' scritti a mano. */
          <div className="ds-on-ink mt-12 rounded-2xl bg-ink px-6 py-10 text-on-ink md:px-10 md:py-12">
            <h2 className="ds-display text-title">{tHub('estatesHeading')}</h2>
            <p className="mt-4 max-w-[56ch] text-body text-on-ink-muted">{tHub('estatesIntro')}</p>
            <div className="mt-10">
              <EstatesGrid />
            </div>
          </div>
        )}
      </Section>
    </main>
  );
}
