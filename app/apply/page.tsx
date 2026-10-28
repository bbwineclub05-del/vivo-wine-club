import { getTranslations } from 'next-intl/server';

import { Chapter, Statement } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { ApplyForm } from '@/components/ui/ApplyForm';

/**
 * Una porta sola per chi vuole lavorare con il club.
 *
 * Prima ce n'erano tre — /brands per le aziende, /talents per i
 * creator, /collaborate/ambassador per gli ambassador — che portavano
 * a tre moduli diversi senza che nessuno avesse chiesto alla persona
 * chi fosse. Qui la domanda viene prima dei campi.
 *
 * `?kind=` permette alle pagine Studio e Creator di arrivare qui con
 * la risposta già scelta, senza farla ripetere a chi l'ha già data
 * facendo clic su un pulsante.
 */

type Kind = 'ambassador' | 'company' | 'creator' | 'staff';
const KINDS: Kind[] = ['ambassador', 'company', 'creator', 'staff'];

export async function generateMetadata() {
  const t = await getTranslations('site.apply');
  return { title: `${t('metaTitle')} | Vivo Wine Club`, description: t('metaDescription') };
}

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const t = await getTranslations('site.apply');
  const { kind } = await searchParams;
  const initialKind = KINDS.includes(kind as Kind) ? (kind as Kind) : undefined;

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Work', 'with us']} accent={[1, 5]} />
        </Section>

        <Section className="pt-0">
          <div className="max-w-[720px]">
            <Statement align="left" className="max-w-[20ch]">
              {t('heading')}
            </Statement>

            <p className="mt-6 max-w-[56ch] text-lead text-on-paper-muted">{t('intro')}</p>

            <div className="mt-12">
              <ApplyForm initialKind={initialKind} />
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
