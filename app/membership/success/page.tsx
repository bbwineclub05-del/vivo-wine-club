import { getTranslations } from 'next-intl/server';

import { Chapter } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { MembershipSuccess } from '@/components/ui/MembershipSuccess';

export async function generateMetadata() {
  const t = await getTranslations('membership');
  return { title: `${t('paidHeading')} — Vivo Wine Club` };
}

export default async function MembershipSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <>
      <SiteNav />
      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Grazie']} accent={[0, 0]} />
        </Section>
        <Section className="pt-0">
          <div className="max-w-[560px]">
            <MembershipSuccess sessionId={session_id ?? null} />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
