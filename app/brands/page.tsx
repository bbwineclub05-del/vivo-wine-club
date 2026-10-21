import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { ButtonLink } from '@/components/ui/Button';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { PartnerLogos } from '@/components/ui/PartnerLogos';
import CartDrawer from '@/components/CartDrawer';

export async function generateMetadata() {
  const t = await getTranslations('site.brands');
  return { title: 'Vivo Studio — Vivo Wine Club', description: t('statement') };
}

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const;
const PACKS = ['pack1', 'pack2', 'pack3'] as const;
const CASES = ['case1', 'case2'] as const;

export default async function BrandsPage() {
  const t = await getTranslations('site.brands');

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

        {/* ── How we work ─────────────────────────────────────
            Numbered because the order is the information: a brand
            needs to know what happens before it commits. */}
        <Section ground="paper-soft">
          <h2 className="ds-display text-title">{t('howTitle')}</h2>
          <ol className="mt-12 grid gap-y-10 md:grid-cols-2 md:gap-x-12 lg:grid-cols-4 lg:gap-x-8">
            {STEPS.map((s, i) => (
              <li key={s} className="border-t border-rule-paper pt-5">
                <span className="ds-numeric ds-display block text-subtitle text-accent-soft">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-subtitle font-medium">{t(`${s}Title`)}</h3>
                <p className="mt-2 text-body text-on-paper-muted">{t(`${s}Body`)}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── Ways to work together ───────────────────────────
            One container split by hairlines rather than three
            floating tiles: these are columns of one comparison. */}
        <Section>
          <h2 className="ds-display text-title">{t('packagesTitle')}</h2>
          <p className="mt-4 max-w-[58ch] text-lead text-on-paper-muted">{t('packagesNote')}</p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-rule-paper">
            <div className="grid divide-y divide-rule-paper md:grid-cols-3 md:divide-x md:divide-y-0">
              {PACKS.map((p) => (
                <div key={p} className="flex flex-col justify-between gap-8 p-8">
                  <div>
                    <h3 className="ds-display text-subtitle">{t(`${p}Title`)}</h3>
                    <p className="mt-4 text-body text-on-paper-muted">{t(`${p}Body`)}</p>
                  </div>
                  <p className="text-fine text-on-paper-muted/80">{t(`${p}Meta`)}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── The creators ────────────────────────────────────── */}
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

        {/* ── Case studies ────────────────────────────────────
            Placeholders: fill in once the first numbers are agreed. */}
        <Section>
          <h2 className="ds-display text-title">{t('casesTitle')}</h2>
          <p className="mt-4 max-w-[58ch] text-lead text-on-paper-muted">{t('casesNote')}</p>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {CASES.map((c) => (
              <article key={c} className="border-t border-rule-paper pt-6">
                <h3 className="text-subtitle font-medium">{t(`${c}Title`)}</h3>
                <p className="ds-numeric mt-1 text-fine text-on-paper-muted">{t(`${c}Meta`)}</p>
                <p className="mt-4 text-body text-on-paper-muted">{t(`${c}Body`)}</p>
              </article>
            ))}
          </div>

          <Link
            href="/events"
            className="ds-link mt-10 inline-flex min-h-[48px] items-center gap-2.5 text-body font-medium no-underline hover:text-accent"
          >
            {t('casesCta')}
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
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
      <CartDrawer />
    </>
  );
}
