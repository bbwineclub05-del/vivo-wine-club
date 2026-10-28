import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { withLinks } from '@/components/ui/withLinks';
import { faqFor } from '@/lib/faq';

export async function generateMetadata() {
  const t = await getTranslations('faq');
  return { title: `${t('title')} | Vivo Wine Club`, description: t('intro') };
}

/**
 * Le domande frequenti.
 *
 * Era una sezione animata con framer-motion, in inglese, che apriva
 * una risposta alla volta. Qui è `<details>`: si aprono anche tutte
 * insieme, il testo si trova con il cerca-nella-pagina del browser,
 * funziona prima che il JavaScript arrivi e la pagina resta un
 * componente server — che è quanto serve a una pagina di testo.
 */
export default async function FaqPage() {
  const locale = await getLocale();
  const t = await getTranslations('faq');
  const domande = faqFor(locale);

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <div className="mx-auto max-w-[1180px] px-gutter pb-band pt-28 md:px-10 md:pt-32">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-fine text-on-paper-muted transition-colors hover:text-accent"
          >
            <ArrowLeft size={15} strokeWidth={1.9} />
            {t('back')}
          </Link>

          <h1 className="ds-display mt-7 text-title">{t('title')}</h1>
          <p className="mt-4 max-w-[52ch] text-lead text-on-paper-muted">{t('intro')}</p>

          <div className="mt-12 border-t border-rule-paper">
            {domande.map((d, i) => (
              <details key={i} className="group border-b border-rule-paper">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 py-5 [&::-webkit-details-marker]:hidden">
                  <h2 className="ds-display text-subtitle transition-colors group-open:text-accent">
                    {d.q}
                  </h2>
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rule-paper text-accent transition-transform group-open:rotate-45">
                    <Plus size={15} strokeWidth={2} />
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-6 text-body text-on-paper-muted">{withLinks(d.a)}</p>
              </details>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-4 rounded-2xl border border-rule-paper p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="ds-display text-subtitle">{t('ctaTitle')}</p>
              <p className="mt-1.5 text-body text-on-paper-muted">{t('ctaBody')}</p>
            </div>
            <Link
              href="/membership"
              className="inline-flex min-h-[52px] shrink-0 items-center justify-center rounded-full bg-accent px-6 text-fine font-medium text-paper transition-opacity hover:opacity-90"
            >
              {t('ctaButton')}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
