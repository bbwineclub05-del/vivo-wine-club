'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const NAV_LINKS = [
  { href: '/events',      label: 'EVENTS',        page: true  },
  { href: '/wine-map',    label: 'WINE VISITS',    page: true  },
  { href: '/wear-the-club', label: 'WEAR THE CLUB', page: true  },
  { href: '/who-we-are',  label: 'WHO WE ARE',     page: true  },
  { href: '/collaborate', label: 'COLLABORATE',    page: true  },
];

function scrollTo(href: string) {
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.49 2.49 0 0 0 2.5 5.99C2.5 7.37 3.6 8.49 4.98 8.49a2.49 2.49 0 0 0 0-4.99ZM2.76 10.2h4.44V21H2.76V10.2ZM9.35 10.2h4.25v1.49h.06c.59-1.12 2.04-2.3 4.2-2.3 4.49 0 5.32 2.96 5.32 6.8V21h-4.43v-4.27c0-1.02-.02-2.33-1.42-2.33-1.43 0-1.64 1.11-1.64 2.26V21H9.35V10.2Z" />
    </svg>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07Z" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/vivo.wineclub/', Icon: InstagramIcon },
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/company/vivowineclub/?viewAsMember=true', Icon: LinkedInIcon },
  { label: 'TikTok',    href: 'https://www.tiktok.com/@vivo.wineclub', Icon: TikTokIcon },
];

const NAV_LINK_CLASS =
  'relative text-[11px] tracking-[0.28em] text-[#6b3333] hover:text-[#731515] transition-colors duration-300 group whitespace-nowrap';
const NAV_UNDERLINE =
  'absolute -bottom-0.5 left-0 h-px w-0 bg-[#731515] group-hover:w-full transition-all duration-300';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  function handleHashLink(href: string) {
    setMobileOpen(false);
    // If we're not on the home page, navigate there first then scroll
    if (window.location.pathname !== '/') {
      router.push(`/${href}`);
    } else {
      scrollTo(href);
    }
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: 'auto' }}
        className="fixed top-0 left-0 right-0 z-[200] bg-white border-b border-[#e8d5d5] shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-6">

          {/* Logo — links to home */}
          <Link href="/" className="flex items-center gap-1.5 group shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/main-logo.png"
              alt=""
              width={200}
              height={80}
              className="w-auto object-contain group-hover:opacity-70 transition-[opacity] duration-300"
              style={{ height: 80 }}
            />
            <span
              className="text-[17px] font-light tracking-[0.08em] text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300 leading-tight hidden sm:block"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Vivo Wine Club
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8 xl:gap-10">
            {NAV_LINKS.map((link) =>
              link.page ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className={NAV_LINK_CLASS}
                >
                  {link.label}
                  <span className={NAV_UNDERLINE} />
                </Link>
              ) : (
                <button
                  key={link.href}
                  onClick={() => handleHashLink(link.href)}
                  className={NAV_LINK_CLASS}
                >
                  {link.label}
                  <span className={NAV_UNDERLINE} />
                </button>
              )
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-[#9a6060] hover:text-[#731515] transition-colors duration-300"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
            <div className="w-px h-4 bg-[#e8d5d5]" />
            <Link
              href={user ? '/members' : '/login'}
              className="flex items-center gap-1.5 text-[10px] tracking-[0.28em] text-[#6b3333] hover:text-[#731515] transition-colors duration-300 group whitespace-nowrap"
            >
              <User size={13} className="shrink-0" />
              {user ? 'MY AREA' : 'SIGN IN'}
            </Link>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 text-[#6b3333] hover:text-[#731515] transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-0 right-0 z-[190] bg-white border-b border-[#e8d5d5] lg:hidden shadow-sm"
          >
            <div className="px-8 py-8 flex flex-col gap-7">
              {NAV_LINKS.map((link) =>
                link.page ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-left text-[11px] tracking-[0.4em] text-[#6b3333] hover:text-[#731515] transition-colors"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={link.href}
                    onClick={() => handleHashLink(link.href)}
                    className="text-left text-[11px] tracking-[0.4em] text-[#6b3333] hover:text-[#731515] transition-colors"
                  >
                    {link.label}
                  </button>
                )
              )}
              <Link
                href={user ? '/members' : '/login'}
                onClick={() => setMobileOpen(false)}
                className="text-left text-[11px] tracking-[0.4em] text-[#6b3333] hover:text-[#731515] transition-colors flex items-center gap-2"
              >
                <User size={13} />
                {user ? 'MY AREA' : 'SIGN IN'}
              </Link>
              <div className="pt-4 border-t border-[#e8d5d5] flex items-center gap-4">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="text-[#9a6060] hover:text-[#731515] transition-colors">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
