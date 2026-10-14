'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import EstatesGrid from '@/components/EstatesGrid';
import { Chapter } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteNav } from '@/components/ui/SiteNav';
import CartDrawer from '@/components/CartDrawer';

// Stays a client page: the region filter is read from `?region=`, which
// the wine map links into.
function WineriesContent() {
  const t = useTranslations('eventsHub');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get('region') ?? undefined;

  return (
    <>
      <Section bleed width="full" tight className="pt-band">
        <Chapter as="h1" lines={['Cantine']} accent={[0, 0]} />
      </Section>

      <Section className="pt-0">
        <Link
          href="/events#estates"
          className="ds-link group inline-flex min-h-[48px] items-center gap-2 text-body no-underline hover:text-accent"
        >
          <ArrowLeft
            size={16}
            strokeWidth={1.75}
            className="transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          {tCommon('back')}
        </Link>

        <p className="mt-6 max-w-[62ch] text-lead text-on-paper-muted">{t('estatesIntro')}</p>

        <div className="mt-12">
          <EstatesGrid initialRegion={initialRegion} />
        </div>
      </Section>
    </>
  );
}

export default function WineriesIndexPage() {
  return (
    <>
      <SiteNav />
      <main className="ds bg-paper text-on-paper">
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <WineriesContent />
        </Suspense>
      </main>
      <CartDrawer />
    </>
  );
}
