'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type DisplayStatus } from '@/lib/events';

/**
 * Il comando che trasforma un elenco in una vendita.
 *
 * Porta alla pagina dell'evento, non al pagamento. Chiedere la carta
 * di credito a chi ha visto solo un titolo e una data vuol dire
 * chiedere di decidere senza sapere: dove si tiene, che cosa si beve,
 * chi ci sara'. La pagina dell'evento quelle cose le dice, e il
 * pulsante per pagare sta li' sotto.
 *
 * Gli indirizzi restano quelli di sempre, `/checkout/{slug}` e
 * `/events/{slug}`: sono stampati sui biglietti in circolazione e
 * dentro alle mail gia' partite.
 */
const PILL =
  'inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-full px-6 text-fine font-medium';

export default function EventStatusBadge({
  displayStatus,
  slug,
  isListOnly = false,
}: {
  displayStatus: DisplayStatus;
  slug: string;
  isListOnly?: boolean;
}) {
  const t = useTranslations('events');

  if (displayStatus === 'open') {
    const href = isListOnly ? `/events/${slug}#guest-form` : `/events/${slug}`;
    return (
      <Link
        href={href}
        className={`${PILL} bg-accent text-paper transition-colors duration-200 hover:bg-accent-lift
          shadow-[0_1px_2px_rgba(26,5,5,0.16),0_8px_24px_-12px_rgba(115,21,21,0.5)] active:translate-y-px`}
      >
        {isListOnly ? t('joinTheList') : t('buyTickets')}
      </Link>
    );
  }

  if (displayStatus === 'soldout') {
    return <span className={`${PILL} bg-ink text-on-ink`}>{t('soldOut')}</span>;
  }

  if (displayStatus === 'soon') {
    return (
      <span className={`${PILL} border border-rule-paper text-on-paper-muted`}>
        {t('comingSoon')}
      </span>
    );
  }

  if (displayStatus === 'closed') {
    return (
      <span className={`${PILL} border border-rule-paper text-on-paper-muted`}>
        {t('registrationClosed')}
      </span>
    );
  }

  // 'past' or 'completed'
  return (
    <span className={`${PILL} border border-rule-paper text-on-paper-muted/70`}>
      {t('completed')}
    </span>
  );
}
