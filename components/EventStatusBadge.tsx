'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type DisplayStatus } from '@/lib/events';

/**
 * The one control that turns a listing into a sale. Restyled for the 2026
 * system; the routing is untouched on purpose: `/checkout/{slug}` and
 * `/events/{slug}#guest-form` are already printed in emails and on
 * tickets in circulation.
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
    const href = isListOnly ? `/events/${slug}#guest-form` : `/checkout/${slug}`;
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
