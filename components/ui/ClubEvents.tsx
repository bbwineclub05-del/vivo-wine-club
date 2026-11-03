'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, MapPin } from 'lucide-react';

import EventStatusBadge from '@/components/EventStatusBadge';
import {
  eventDateStack,
  getEventDisplayStatus,
  sectionFromType,
  type EventData,
  type EventSection,
} from '@/lib/events';

type Filter = 'all' | EventSection;

const FILTERS: { value: Filter; key: string }[] = [
  { value: 'all', key: 'filterAll' },
  { value: 'wine_party', key: 'filterParty' },
  { value: 'wine_lounge', key: 'filterLounge' },
  { value: 'winery_visit', key: 'filterVisits' },
  { value: 'general', key: 'filterGeneral' },
];

/**
 * The calendar. Every status, href and label comes from the existing
 * event logic: this component changes how a date looks, never whether
 * it can be bought.
 */
/** «novembre» → «Novembre»: la lingua decide il nome, noi l'iniziale. */
function maiuscola(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ClubEvents({ events }: { events: EventData[] }) {
  const t = useTranslations('site.club');
  const te = useTranslations('events');
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>('all');
  const reduce = useReducedMotion();
  const today = new Date().toISOString().slice(0, 10);

  // Only offer a filter that would actually return something.
  const available = useMemo(() => {
    const present = new Set(events.map((e) => sectionFromType(e.type)));
    return FILTERS.filter((f) => f.value === 'all' || present.has(f.value));
  }, [events]);

  const shown = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => sectionFromType(e.type) === filter)),
    [events, filter],
  );

  /* Un gruppo per mese, nell'ordine in cui arrivano le date. L'anno
     si scrive solo quando non e' quello che stiamo vivendo: «Gennaio»
     dentro il 2026 non ha bisogno di spiegazioni, «Gennaio 2027» si'. */
  const mesi = useMemo(() => {
    const annoOra = new Date().getUTCFullYear();
    const gruppi: { chiave: string; titolo: string; eventi: EventData[] }[] = [];
    for (const e of shown) {
      const chiave = e.date.slice(0, 7);
      const d = new Date(`${e.date.slice(0, 10)}T12:00:00Z`);
      const nome = maiuscola(d.toLocaleString(locale, { month: 'long', timeZone: 'UTC' }));
      const titolo = d.getUTCFullYear() === annoOra ? nome : `${nome} ${d.getUTCFullYear()}`;
      const ultimo = gruppi[gruppi.length - 1];
      if (ultimo && ultimo.chiave === chiave) ultimo.eventi.push(e);
      else gruppi.push({ chiave, titolo, eventi: [e] });
    }
    return gruppi;
  }, [shown, locale]);

  if (events.length === 0) {
    return <p className="max-w-[52ch] text-lead text-on-paper-muted">{t('empty')}</p>;
  }

  return (
    <div>
      {available.length > 2 && (
        <div className="flex flex-wrap gap-2.5" role="group">
          {available.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`min-h-[48px] rounded-full border px-5 text-fine font-medium transition-colors duration-200 ${
                  active
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper text-on-paper hover:border-accent/40'
                }`}
              >
                {t(f.key)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-10 sm:gap-14">
        {mesi.map((mese) => (
          <section key={mese.chiave} className="md:grid md:grid-cols-[140px_1fr] md:gap-10">
            <h3 className="ds-display text-subtitle text-on-paper md:sticky md:top-28 md:self-start">
              {mese.titolo}
            </h3>

            <ul className="mt-4 border-t border-rule-paper md:mt-0">
        {mese.eventi.map((event, i) => {
          const status = getEventDisplayStatus(event, today);
          const faded = status === 'past' || status === 'closed';
          const href = `/events/${event.slug}`;

          return (
            <motion.li
              key={event.slug}
              className="border-b border-rule-paper"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className={`flex flex-wrap items-center gap-x-6 gap-y-5 py-7 sm:flex-nowrap ${
                  faded ? 'opacity-55' : ''
                }`}
              >
                {/* Date
                    Sul telefono resta il giorno e basta. Il mese e'
                    gia' scritto grande sopra il gruppo, il giorno
                    della settimana e' un terzo corpo di testo in una
                    colonna larga tre centimetri, e sotto "Dicembre"
                    un secondo "dic 2026" e' la stessa cosa detta due
                    volte. Sul computer, dove lo spazio c'e', resta
                    tutto. */}
                <Link
                  href={href}
                  className="flex w-[48px] shrink-0 flex-col items-center no-underline sm:w-[72px]"
                  aria-label={event.title}
                >
                  <span className="hidden text-fine font-medium uppercase text-accent-soft sm:block">
                    {event.dateMonthOnly
                      ? eventDateStack(event).top
                      : new Date(`${event.date.slice(0, 10)}T12:00:00Z`).toLocaleString(locale, {
                          weekday: 'short',
                          timeZone: 'UTC',
                        })}
                  </span>
                  {event.dateMonthOnly ? (
                    /* Giorno non ancora deciso: la casella resta
                       vuota. Un trattino si legge come "annullato" e
                       una scritta "da definire" e' una riga in piu' da
                       leggere in un elenco che va scorso: il vuoto
                       sotto il nome del mese dice la stessa cosa e non
                       chiede niente. Lo spazio resta occupato, quindi
                       i titoli restano in colonna. */
                    <span className="ds-display ds-numeric hidden text-subtitle leading-none sm:block">
                      {eventDateStack(event).bottom}
                    </span>
                  ) : (
                    <span className="ds-display ds-numeric text-title leading-none">
                      {eventDateStack(event).bottom}
                    </span>
                  )}
                </Link>

                {event.image_url && (
                  <Link
                    href={href}
                    className="relative hidden h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border border-rule-paper sm:block"
                  >
                    <Image
                      src={event.image_url}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </Link>
                )}

                {/* Title and place */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={href}
                    className={`block text-subtitle font-medium no-underline transition-colors hover:text-accent ${
                      event.titleStrikethrough ? 'line-through decoration-accent/60' : ''
                    }`}
                  >
                    {event.title}
                  </Link>
                  {/* L'indirizzo per esteso non serve a scegliere, e
                      troncato a meta' non serve a niente: su un
                      telefono si legge "Utopia, 60 Rue de l'Arbre
                      Sec, 7…". Chi vuole sapere dov'e' apre
                      l'evento. */}
                  <p className="mt-1.5 hidden items-center gap-2 text-body text-on-paper-muted sm:flex">
                    <MapPin size={14} strokeWidth={1.7} className="shrink-0 text-accent-soft" />
                    <span className="truncate">{event.locationFull}</span>
                  </p>
                </div>

                <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
                  {event.membersOnly && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/8 px-2.5 py-1 text-[11px] font-medium leading-none text-accent sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-fine">
                      <Lock size={11} strokeWidth={2} className="sm:hidden" />
                      <Lock size={13} strokeWidth={2} className="hidden sm:block" />
                      {te('membersOnly')}
                    </span>
                  )}
                  <EventStatusBadge
                    displayStatus={status}
                    slug={event.slug}
                    isListOnly={event.isListOnly}
                  />
                </div>
              </div>
            </motion.li>
          );
        })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
