import { getTranslations } from 'next-intl/server';

import { Chapter } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { MembershipRenew } from '@/components/ui/MembershipRenew';

export async function generateMetadata() {
  const t = await getTranslations('membership');
  return { title: `${t('renewHeading')} | Vivo Wine Club` };
}

export default async function MembershipRenewPage() {
  const t = await getTranslations('membership');

  return (
    <>
      <SiteNav />
      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Rinnova']} accent={[0, 0]} />
        </Section>
        <Section className="pt-0">
          <div className="max-w-[560px]">
            <h2 className="ds-display text-title">{t('renewHeading')}</h2>
            <div className="mt-8">
              <MembershipRenew />
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
