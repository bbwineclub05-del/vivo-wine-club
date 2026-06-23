'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type EventStatus } from '@/lib/events';

export default function EventStatusBadge({
  status,
  slug,
  isListOnly = false,
}: {
  status: EventStatus;
  slug: string;
  isListOnly?: boolean;
}) {
  const t = useTranslations('events');

  if (status === 'open') {
    if (isListOnly) {
      return (
        <Link
          href={`/events/${slug}#guest-form`}
          className="inline-flex items-center text-[9px] tracking-[0.28em] px-5 py-3 min-h-[44px] bg-[#731515] text-white hover:bg-[#aa4848] transition-colors duration-300 whitespace-nowrap rounded-lg"
        >
          {t('joinTheList')}
        </Link>
      );
    }
    return (
      <Link
        href={`/checkout/${slug}`}
        className="inline-flex items-center text-[9px] tracking-[0.28em] px-5 py-3 min-h-[44px] bg-[#731515] text-white hover:bg-[#aa4848] transition-colors duration-300 whitespace-nowrap rounded-lg"
      >
        {t('buyTickets')}
      </Link>
    );
  }
  if (status === 'soldout') {
    return (
      <span className="inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#3a3a3a] text-white whitespace-nowrap rounded-lg">
        {t('soldOut')}
      </span>
    );
  }
  if (status === 'soon') {
    return (
      <span className="inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 border border-[#ccc] text-[#aaa] whitespace-nowrap rounded-lg">
        {t('comingSoon')}
      </span>
    );
  }
  return (
    <span className="inline-block text-[9px] tracking-[0.28em] px-5 py-2.5 border border-[#ddd] text-[#bbb] whitespace-nowrap rounded-lg">
      {t('completed')}
    </span>
  );
}
