import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { ButtonLink } from '@/components/ui/Button';
import { Accordion } from '@/components/ui/Accordion';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { caseStudiesFor } from '@/lib/case-studies';
import { CREATOR_VISIBILE } from '@/lib/flags';
import { PartnerLogos } from '@/components/ui/PartnerLogos';

export async function generateMetadata() {
  const t = await getTranslations('site.brands');
  return { title: 'Vivo Studio | Vivo Wine Club', description: t('statement') };
}

const SERVIZI = ['do1', 'do2', 'do3', 'do4', 'do5', 'do6'] as const;
const PACKS = ['pack1', 'pack2', 'pack3'] as const;

export default async function BrandsPage() {
  const t = await getTranslations('site.brands');
  const casi = caseStudiesFor(await getLocale());

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Vivo', 'Studio']} accent={[1, 3]} />
        </Section>

        {/* ── The proposition ─────────────────────────────────── */}
        <Section className="pt-0">
          <Statement align="left" className="max-w-[20ch]">
            {t('statement')}
          </Statement>
          <div className="mt-10 max-w-[62ch] space-y-5 text-lead text-on-paper-muted">
            <p>{t('intro1')}</p>
            <p>{t('intro2')}</p>
          </div>
        </Section>

        {/* ── Cosa facciamo ───────────────────────────────────
            Erano quattro tappe di un processo: brief, creator,
            produzione, distribuzione. Raccontavano come lavoriamo
            dentro, mentre chi legge qui cerca sé stesso: «fate anche
            gli eventi in cantina?». Adesso e' un elenco di servizi,
            e il dettaglio si apre solo a chi lo vuole. */}
        <Section ground="paper-soft">
          <h2 className="ds-display text-title">{t('doTitle')}</h2>
          <p className="mt-4 max-w-[58ch] text-lead text-on-paper-muted">{t('doNote')}</p>

          <div className="mt-10">
            <Accordion
              items={SERVIZI.map((v) => ({
                id: v,
                titolo: t(`${v}Title`),
                corpo: t(`${v}Body`),
              }))}
            />
          </div>
        </Section>


        {/* ── Le tre forme ────────────────────────────────────
            Erano tre colonne dentro un riquadro diviso da linee: la
            forma dei piani di un abbonamento, che qui non c'entra, e
            tre caselle strette che spezzavano il testo ogni cinque
            parole. Sono tre modi diversi di lavorare, non tre prezzi
            da confrontare: si leggono uno dopo l'altro, e ognuno ha
            la riga larga che gli serve. */}
        <Section>
          <h2 className="ds-display text-title">{t('packagesTitle')}</h2>
          <p className="mt-4 max-w-[58ch] text-lead text-on-paper-muted">{t('packagesNote')}</p>

          <ul className="mt-12 border-t border-rule-paper">
            {PACKS.map((p) => (
              <li
                key={p}
                className="grid gap-x-12 gap-y-4 border-b border-rule-paper py-9 md:grid-cols-[clamp(180px,22vw,260px)_1fr]"
              >
                <h3 className="ds-display text-subtitle">{t(`${p}Title`)}</h3>
                <div>
                  <p className="max-w-[58ch] text-lead text-on-paper-muted">{t(`${p}Body`)}</p>
                  <p className="mt-3 text-fine text-on-paper-muted/80">{t(`${p}Meta`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── The creators ────────────────────────────────────── */}
        {/* Il richiamo ai creator torna con loro: vedi `lib/flags.ts`. */}
        {CREATOR_VISIBILE && (
          <Section ground="ink">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="ds-display text-title">{t('talentsTitle')}</h2>
                <p className="mt-4 max-w-[46ch] text-lead text-on-ink-muted">{t('talentsBody')}</p>
              </div>
              <ButtonLink href="/talents" variant="paper" size="lg">
                {t('talentsCta')}
              </ButtonLink>
            </div>
          </Section>
        )}

        {/* ── Case studies ────────────────────────────────────
            Una riga per caso, come le date del calendario: il nome,
            dove e quando, e il pulsante. Tutto il resto, numeri
            compresi, sta nella sua pagina. */}
        <Section>
          <h2 className="ds-display text-title">{t('casesTitle')}</h2>

          <ul className="mt-10 border-t border-rule-paper">
            {casi.map((c) => (
              <li
                key={c.slug}
                className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5 border-b border-rule-paper py-7"
              >
                <div className="min-w-0">
                  <h3 className="ds-display text-subtitle">{c.marchio}</h3>
                  <p className="mt-1.5 text-fine text-on-paper-muted">{c.sottotitolo}</p>
                </div>
                <ButtonLink href={`/brands/${c.slug}`} variant="outline" size="sm">
                  {t('casesCta')}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Partners ────────────────────────────────────────
            Access, not a client list. The copy says so plainly. */}
        <Section ground="paper-soft" tight>
          <h2 className="ds-display text-title">{t('partnersTitle')}</h2>
          <p className="mt-4 max-w-[58ch] text-lead text-on-paper-muted">{t('partnersBody')}</p>

          <div className="mt-10">
            <PartnerLogos />
          </div>

          <Link
            href="/partners"
            className="ds-link mt-8 inline-flex min-h-[48px] items-center gap-2.5 text-body font-medium no-underline hover:text-accent"
          >
            {t('partnersCta')}
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </Section>

        {/* ── Enquiry ─────────────────────────────────────────── */}
        <Section ground="paper-soft" id="contact">
          <div className="max-w-[640px]">
            <h2 className="ds-display text-title">{t('formTitle')}</h2>
            <p className="mt-4 text-lead text-on-paper-muted">{t('formBody')}</p>
            <div className="mt-10">
              <ButtonLink href="/apply?kind=company" size="lg">
                {t('formCta')}
              </ButtonLink>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
