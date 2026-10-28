import { getTranslations } from 'next-intl/server';

import { Chapter, Statement } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { ShopGrid } from '@/components/ui/ShopGrid';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';

export async function generateMetadata() {
  const t = await getTranslations('wearTheClub');
  return { title: `${t('heading')} | Vivo Wine Club`, description: t('subtitle') };
}

// The URL stays /wear-the-club: it is the Stripe cancel_url for merch and
// it appears in order emails already sent. Only the label in the nav says
// "Shop".
export default async function WearTheClubPage() {
  const t = await getTranslations('wearTheClub');

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Shop']} accent={[0, 0]} />
        </Section>

        <Section className="pt-0">
          <Statement align="left" className="max-w-[18ch]">
            {t('subtitle')}
          </Statement>
        </Section>

        <Section ground="paper-soft" className="pt-0">
          <ShopGrid />
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
