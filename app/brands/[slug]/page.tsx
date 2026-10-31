import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';

import { ButtonLink } from '@/components/ui/Button';
import { CaseTimeline } from '@/components/ui/CaseTimeline';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { CASE_SLUGS, caseStudyFor } from '@/lib/case-studies';

/**
 * Un caso studio, per intero.
 *
 * La pagina non sa niente della serata: prende tutto da
 * `lib/case-studies.ts`. Il secondo caso sara' un oggetto in piu' in
 * quel file, non un'altra pagina da scrivere.
 */

export function generateStaticParams() {
  return CASE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caso = caseStudyFor(slug, await getLocale());
  if (!caso) return {};
  return { title: `${caso.titolo} | Vivo Studio`, description: caso.sintesi };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caso = caseStudyFor(slug, await getLocale());
  if (!caso) notFound();

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        {/* ── Chi, cosa, quando ── */}
        <Section className="pt-band">
          <Link
            href="/brands"
            className="inline-flex min-h-[44px] items-center gap-2 text-fine font-medium text-on-paper-muted no-underline transition-colors hover:text-accent"
          >
            <ArrowLeft size={15} strokeWidth={1.8} />
            Vivo Studio
          </Link>

          <p className="mt-8 text-fine font-medium uppercase tracking-[0.18em] text-accent-soft">
            {caso.occhiello}
          </p>
          <h1 className="ds-display mt-3 max-w-[16ch] text-statement leading-[0.95]">
            {caso.titolo}
          </h1>
          <p className="mt-5 text-lead text-on-paper-muted">{caso.sottotitolo}</p>
          <p className="mt-8 max-w-[56ch] text-lead">{caso.sintesi}</p>
        </Section>

        {/* ── I quattro numeri che si leggono per primi ── */}
        <Section ground="ink" tight>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {caso.numeri.map((n) => (
              <div key={n.etichetta} className="border-t border-rule-ink pt-5">
                <dd className="ds-display ds-numeric text-[clamp(2.4rem,5vw,3.4rem)] leading-none">
                  {n.valore}
                </dd>
                <dt className="mt-3 text-body font-medium">{n.etichetta}</dt>
                {n.nota && <p className="mt-1.5 text-fine text-on-ink-muted">{n.nota}</p>}
              </div>
            ))}
          </dl>
        </Section>

        {/* ── Com'e' andata, passo per passo ── */}
        <Section>
          <CaseTimeline tappe={caso.tappe} />
        </Section>

        {/* ── Cosa ci ha insegnato ── */}
        <Section ground="paper-soft">
          <h2 className="ds-display text-title">{caso.lezioniTitolo}</h2>
          <ol className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {caso.lezioni.map((l, i) => (
              <li key={l.titolo} className="border-t border-rule-paper pt-5">
                <span className="ds-numeric ds-display block text-subtitle text-accent-soft">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-subtitle font-medium">{l.titolo}</h3>
                <p className="mt-2 text-body text-on-paper-muted">{l.corpo}</p>
              </li>
            ))}
          </ol>

          <p className="mt-12 max-w-[72ch] text-fine text-on-paper-muted">{caso.fonte}</p>
        </Section>

        {/* ── E adesso? ── */}
        <Section>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="ds-display max-w-[18ch] text-title">{caso.ctaTitolo}</h2>
              <p className="mt-4 max-w-[46ch] text-lead text-on-paper-muted">{caso.ctaCorpo}</p>
            </div>
            <ButtonLink href="/apply?kind=company" size="lg">
              {caso.cta}
            </ButtonLink>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
