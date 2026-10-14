'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, ShoppingBag, User, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/contexts/CartContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ButtonLink } from '@/components/ui/Button';
import { SocialRow } from '@/components/ui/SocialIcons';

/**
 * Six destinations and one call to action, on a single line at desktop.
 * Keeps the cart, the account entry and the language switcher that the
 * rest of the app depends on.
 */
const LINKS = [
  { href: '/brands', key: 'studio' },
  { href: '/talents', key: 'creators' },
  { href: '/events', key: 'club' },
  { href: '/wear-the-club', key: 'shop' },
  { href: '/manifesto', key: 'manifesto' },
] as const;

export function SiteNav() {
  const t = useTranslations('site.nav');
  const tNav = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { itemCount, setIsOpen: openCart } = useCart();
  const reduce = useReducedMotion();

  // The open menu owns the viewport: nothing behind it should scroll.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="ds sticky top-0 z-[200] border-b border-rule-paper bg-paper/85 backdrop-blur-md">
        <nav className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-8 px-gutter md:px-10">
          <Link href="/" aria-label="Vivo Wine Club" className="shrink-0">
            <Image src="/main-logo.png" alt="Vivo Wine Club" width={74} height={28} priority />
          </Link>

          <ul className="hidden flex-1 items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="ds-link text-body font-medium text-on-paper no-underline hover:text-accent"
                >
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            <SocialRow
              className="hidden md:flex"
              itemClassName="text-on-paper hover:bg-paper-soft hover:text-accent"
            />

            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-rule-paper md:block" />

            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>

            <button
              onClick={() => openCart(true)}
              aria-label="Cart"
              className="relative grid h-12 w-12 place-items-center rounded-full text-on-paper hover:bg-paper-soft"
            >
              <ShoppingBag size={19} strokeWidth={1.6} />
              {itemCount > 0 && (
                <span className="ds-numeric absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">
                  {itemCount}
                </span>
              )}
            </button>

            <Link
              href={user ? '/members' : '/login'}
              aria-label={user ? tNav('myArea') : tNav('signIn')}
              className="hidden h-12 w-12 place-items-center rounded-full text-on-paper hover:bg-paper-soft lg:grid"
            >
              <User size={19} strokeWidth={1.6} />
            </Link>

            <ButtonLink href="/membership" size="sm" className="hidden lg:inline-flex">
              {t('join')}
            </ButtonLink>

            <button
              onClick={() => setOpen(true)}
              aria-label={t('menu')}
              className="grid h-12 w-12 place-items-center rounded-full text-on-paper hover:bg-paper-soft lg:hidden"
            >
              <Menu size={22} strokeWidth={1.6} />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ds ds-on-ink fixed inset-0 z-[300] flex flex-col bg-ink text-on-ink lg:hidden"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex h-[72px] shrink-0 items-center justify-between px-gutter">
              <Image src="/logobianco.png" alt="Vivo Wine Club" width={74} height={28} />
              <button
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="grid h-12 w-12 place-items-center rounded-full hover:bg-ink-soft"
              >
                <X size={22} strokeWidth={1.6} />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-between overflow-y-auto px-gutter pb-10 pt-6">
              <ul>
                {LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="ds-display block py-3 text-title"
                    >
                      {t(l.key)}
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-5">
                <ButtonLink
                  href="/membership"
                  variant="paper"
                  size="lg"
                  onClick={() => setOpen(false)}
                >
                  {t('join')}
                </ButtonLink>
                <SocialRow
                  size={20}
                  className="-ml-3 gap-1"
                  itemClassName="text-on-ink/80 hover:bg-ink-soft hover:text-rose"
                />

                <div className="flex items-center justify-between">
                  <Link
                    href={user ? '/members' : '/login'}
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[48px] items-center gap-2.5 text-body"
                  >
                    <User size={18} strokeWidth={1.6} />
                    {user ? tNav('myArea') : tNav('signIn')}
                  </Link>
                  <LanguageSwitcher up />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
