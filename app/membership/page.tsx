import { getTranslations } from 'next-intl/server';

import { Chapter, Statement } from '@/components/ui/Chapter';
import { MembershipForm } from '@/components/ui/MembershipForm';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import CartDrawer from '@/components/CartDrawer';

export async function generateMetadata() {
  const t = await getTranslations('membership');
  return { title: `${t('heading')} — Vivo Wine Club`, description: t('subtitle') };
}

export default async function MembershipPage() {
  const t = await getTranslations('membership');

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Join']} accent={[0, 0]} />
        </Section>

        <Section className="pt-0">
          <div className="max-w-[640px]">
            <Statement align="left" className="max-w-[18ch]">
              {t('subtitle')}
            </Statement>

            <div className="mt-12">
              <MembershipForm />
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
      <CartDrawer />
    </>
  );
}
