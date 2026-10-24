import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { withLinks } from '@/components/ui/withLinks';
import type { LegalDocument } from '@/lib/legal/types';

/**
 * Un documento legale, letto da un telefono.
 *
 * Questi testi nessuno li legge dall'inizio alla fine: si arriva
 * cercando una cosa — chi tratta i dati, come si cancella un account,
 * quali cookie — e si vuole trovarla subito. Quindi la pagina è fatta
 * di due cose: un indice sempre raggiungibile e una colonna di testo
 * larga quanto si riesce a leggere senza perdere la riga.
 *
 * L'indice è `<details>` sul telefono e una colonna appiccicata al
 * bordo sul desktop: la stessa lista, senza una riga di JavaScript.
 */

/** L'ancora di una sezione, dal suo titolo. */
function ancora(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
}

/** Telefono: sotto il titolo, chiuso, così non spinge via il testo. */
function IndiceMobile({ voci, label }: { voci: { id: string; heading: string }[]; label: string }) {
  return (
      <details className="group mt-10 rounded-2xl border border-rule-paper lg:hidden">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 text-fine font-medium [&::-webkit-details-marker]:hidden">
          {label}
          <span className="text-accent transition-transform group-open:rotate-45">+</span>
        </summary>
        <ol className="flex flex-col gap-0.5 border-t border-rule-paper px-2 py-2">
          {voci.map((v) => (
            <li key={v.id}>
              <a
                href={`#${v.id}`}
                className="block rounded-xl px-2 py-2 text-fine text-on-paper-muted transition-colors hover:bg-paper-soft hover:text-on-paper"
              >
                {v.heading}
              </a>
            </li>
          ))}
        </ol>
      </details>
  );
}

/** Desktop: resta a fianco mentre il testo scorre. */
function IndiceDesktop({ voci, label }: { voci: { id: string; heading: string }[]; label: string }) {
  return (
      <nav className="hidden lg:block" aria-label={label}>
        <p className="text-fine uppercase tracking-[0.2em] text-on-paper-muted">{label}</p>
        <ol className="mt-4 flex flex-col gap-2 border-l border-rule-paper">
          {voci.map((v) => (
            <li key={v.id}>
              <a
                href={`#${v.id}`}
                className="-ml-px block border-l border-transparent pl-4 text-fine text-on-paper-muted transition-colors hover:border-accent hover:text-accent"
              >
                {v.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>
  );
}

export async function LegalDoc({ document }: { document: LegalDocument }) {
  const t = await getTranslations('legal');

  const voci = document.sections
    .filter((s) => s.heading)
    .map((s) => ({ id: ancora(s.heading as string), heading: s.heading as string }));

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
            {t('backToHome')}
          </Link>

          <h1 className="ds-display mt-7 text-title">{document.title}</h1>

          {document.subtitle && (
            <p className="mt-3 max-w-[58ch] text-fine text-on-paper-muted">{document.subtitle}</p>
          )}

          {document.lastUpdated && (
            <p className="mt-5 inline-flex rounded-full border border-rule-paper px-3 py-1 text-fine text-on-paper-muted">
              {t('lastUpdated', { date: document.lastUpdated })}
            </p>
          )}

          <IndiceMobile voci={voci} label={t('index')} />

          <div className="mt-12 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
            <div className="lg:order-2 lg:max-w-[68ch]">
              {document.intro?.map((para, i) => (
                <p key={i} className="mb-4 text-lead text-on-paper-muted last:mb-0">
                  {withLinks(para)}
                </p>
              ))}

              <div className="mt-10 flex flex-col gap-10">
                {document.sections.map((section, i) => (
                  <section key={i} id={section.heading ? ancora(section.heading) : undefined} className="scroll-mt-28">
                    {section.heading && (
                      <h2 className="ds-display text-subtitle text-accent">{section.heading}</h2>
                    )}

                    {section.paragraphs?.map((para, j) => (
                      <p key={j} className={`text-body text-on-paper-muted ${section.heading || j > 0 ? 'mt-3' : ''}`}>
                        {withLinks(para)}
                      </p>
                    ))}

                    {section.bullets && (
                      <ul className="mt-4 flex flex-col gap-2.5">
                        {section.bullets.map((bullet, j) => (
                          <li key={j} className="flex gap-3 text-body text-on-paper-muted">
                            <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-accent" />
                            <span>{withLinks(bullet)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </div>

            <div className="lg:sticky lg:top-28 lg:order-1 lg:self-start">
              <IndiceDesktop voci={voci} label={t('index')} />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
