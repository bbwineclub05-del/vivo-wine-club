import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ManageCookiesLink } from '@/components/ui/ManageCookiesLink';

const PAGES = [
  { href: '/brands', key: 'studio' },
  { href: '/talents', key: 'creators' },
  { href: '/events', key: 'club' },
  { href: '/wear-the-club', key: 'shop' },
  { href: '/manifesto', key: 'manifesto' },
  { href: '/membership', key: 'join' },
  { href: '/faq', key: 'faq' },
] as const;

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/vivo.wineclub/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@vivo.wineclub' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/vivowineclub/?viewAsMember=true' },
] as const;

const LEGAL = [
  { href: '/privacy-policy', key: 'privacyPolicy' },
  { href: '/terms-of-service', key: 'termsOfService' },
  { href: '/cookie-policy', key: 'cookiePolicy' },
] as const;

/**
 * Server component: it reads translations with `getTranslations`, so a
 * page that renders it must be a server component too. Pages that need
 * state keep their interactive part in a client island instead.
 *
 * Deliberately quiet. The old footer repeated a full contact block that
 * duplicated whatever call to action the page above had just made; this
 * one gets out of the way and carries only what someone looks for at the
 * bottom of a page.
 */
export async function SiteFooter() {
  const t = await getTranslations('site');
  const tNav = await getTranslations('site.nav');
  const tLegal = await getTranslations('footer');

  return (
    <footer className="ds ds-on-ink bg-ink text-on-ink">
      <div className="mx-auto max-w-[1440px] px-gutter py-band-tight md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
          <div>
            <Image src="/logobianco.png" alt="Vivo Wine Club" width={92} height={34} />
            <p className="mt-5 max-w-[26ch] text-body text-on-ink-muted">
              {t('footer.tagline')}
            </p>
          </div>

          <nav aria-label={t('footer.navTitle')}>
            <h2 className="text-fine font-medium text-on-ink-muted">{t('footer.navTitle')}</h2>
            <ul className="mt-4 space-y-1">
              {PAGES.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="ds-link inline-flex min-h-[44px] items-center text-body no-underline hover:text-rose"
                  >
                    {tNav(p.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-fine font-medium text-on-ink-muted">{t('footer.contactTitle')}</h2>
            <ul className="mt-4 space-y-1">
              <li>
                <a
                  href="mailto:info@vivowineclub.com"
                  className="ds-link inline-flex min-h-[44px] items-center text-body no-underline hover:text-rose"
                >
                  info@vivowineclub.com
                </a>
              </li>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-link inline-flex min-h-[44px] items-center text-body no-underline hover:text-rose"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-rule-ink pt-6 text-fine text-on-ink-muted md:flex-row md:items-center md:justify-between">
          <p className="ds-numeric">
            © {new Date().getFullYear()} Vivo Wine Club. {t('footer.rights')}.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="ds-link no-underline hover:text-rose">
                  {tLegal(l.key)}
                </Link>
              </li>
            ))}
            <li>
              <ManageCookiesLink label={tLegal('manageCookies')} />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
