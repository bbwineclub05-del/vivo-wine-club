import { getTranslations } from 'next-intl/server';

import { Chapter, Statement } from '@/components/ui/Chapter';
import { MembershipForm } from '@/components/ui/MembershipForm';
import { MembershipValue } from '@/components/ui/MembershipValue';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';

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

        {/* Prima cosa si prende, poi si chiede chi sei. Il modulo da
            solo chiedeva i dati senza aver mai detto cosa si compra. */}
        <Section className="pt-0">
          <p className="text-fine uppercase tracking-[0.22em] text-accent">{t('valueEyebrow')}</p>
          <Statement align="left" className="mt-5 max-w-[16ch]">
            {t('valueStatement')}
          </Statement>
          <p className="mt-8 max-w-[56ch] text-lead text-on-paper-muted">{t('valueLead')}</p>
        </Section>

        <Section tight ground="paper-soft">
          <MembershipValue />
        </Section>

        {/* Il prezzo e' gia' scritto qui sopra: qui basta il titolo,
            e il modulo lo ripete una volta sola accanto al pulsante. */}
        <Section id="iscrizione">
          <div className="max-w-[640px]">
            <Statement align="left" className="max-w-[12ch]">
              {t('heading')}
            </Statement>

            <div className="mt-12">
              <MembershipForm />
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
