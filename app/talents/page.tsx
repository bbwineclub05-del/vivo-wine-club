import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { ButtonLink } from '@/components/ui/Button';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import CartDrawer from '@/components/CartDrawer';
import { getCreators, PLATFORM_LABEL } from '@/lib/creators';

export async function generateMetadata() {
  const t = await getTranslations('site.talents');
  return { title: 'Creator — Vivo Wine Club', description: t('intro') };
}

export default async function TalentsPage() {
  const t = await getTranslations('site.talents');
  const creators = getCreators();

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Creator']} accent={[0, 0]} />
        </Section>

        <Section className="pt-0">
          <Statement align="left" className="max-w-[20ch]">
            {t('statement')}
          </Statement>
          <p className="mt-10 max-w-[62ch] text-lead text-on-paper-muted">{t('intro')}</p>
        </Section>

        {/* ── The roster ──────────────────────────────────────
            Empty by design until there are real names: an invented
            roster is the one thing a winery would check first. */}
        <Section ground="paper-soft">
          <h2 className="ds-display text-title">{t('rosterTitle')}</h2>

          {creators.length === 0 ? (
            <p className="mt-6 max-w-[52ch] text-lead text-on-paper-muted">{t('rosterEmpty')}</p>
          ) : (
            <ul className="mt-12 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {creators.map((c) => (
                <li key={c.slug}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper">
                    {c.image ? (
                      <Image
                        src={c.image}
                        alt={c.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      // An honest empty frame, not a stand-in avatar.
                      <div className="grid h-full place-items-center border border-dashed border-rule-paper">
                        <span className="px-4 text-center text-fine text-on-paper-muted/70">
                          [Foto]
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="mt-5 text-subtitle font-medium">{c.name}</h3>
                  <p className="mt-1 text-body text-accent-soft">@{c.handle}</p>
                  <p className="mt-2 text-body text-on-paper-muted">{c.niche}</p>
                  <p className="mt-3 text-fine text-on-paper-muted/80">
                    {c.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}
                    {c.reach && <span className="ds-numeric"> · {c.reach}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ── Two ways in ─────────────────────────────────────── */}
        <Section ground="ink">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="ds-display text-title">{t('applyTitle')}</h2>
              <p className="mt-4 max-w-[48ch] text-lead text-on-ink-muted">{t('applyBody')}</p>
            </div>
            {/* Points at the existing, working application until
                /talents/apply ships with the Ambassador/Creator role
                selector. Nothing 404s in the meantime. */}
            <ButtonLink href="/collaborate/ambassador" variant="paper" size="lg">
              {t('applyCta')}
            </ButtonLink>
          </div>
        </Section>

        <Section>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="ds-display text-title">{t('brandsTitle')}</h2>
              <p className="mt-4 max-w-[48ch] text-lead text-on-paper-muted">{t('brandsBody')}</p>
            </div>
            <ButtonLink href="/brands" size="lg">
              {t('brandsCta')}
            </ButtonLink>
          </div>
        </Section>
      </main>

      <SiteFooter />
      <CartDrawer />
    </>
  );
}
