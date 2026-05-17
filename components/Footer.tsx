'use client';

import Link from 'next/link';
import Image from 'next/image';

/* ── Social icon SVGs ── */
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.49 2.49 0 0 0 2.5 5.99C2.5 7.37 3.6 8.49 4.98 8.49a2.49 2.49 0 0 0 0-4.99ZM2.76 10.2h4.44V21H2.76V10.2ZM9.35 10.2h4.25v1.49h.06c.59-1.12 2.04-2.3 4.2-2.3 4.49 0 5.32 2.96 5.32 6.8V21h-4.43v-4.27c0-1.02-.02-2.33-1.42-2.33-1.43 0-1.64 1.11-1.64 2.26V21H9.35V10.2Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: 'Events',        href: '/events'       },
  { label: 'Wine Visits',   href: '/wine-map'      },
  { label: 'Wear the Club', href: '/wear-the-club' },
  { label: 'Who We Are',    href: '/who-we-are'    },
  { label: 'Collaborate',   href: '/collaborate'   },
  { label: 'FAQ',           href: '/faq'           },
];

const CONTACTS = [
  {
    Icon: MailIcon,
    label: 'EMAIL',
    value: 'info@vivowineclub.com',
    href: 'mailto:info@vivowineclub.com',
  },
  {
    Icon: InstagramIcon,
    label: 'INSTAGRAM',
    value: '@vivo.wineclub',
    href: 'https://www.instagram.com/vivo.wineclub/',
  },
  {
    Icon: LinkedInIcon,
    label: 'LINKEDIN',
    value: 'Vivo Wine Club',
    href: 'https://www.linkedin.com/company/vivowineclub/?viewAsMember=true',
  },
  {
    Icon: TikTokIcon,
    label: 'TIKTOK',
    value: '@vivowineclub',
    href: 'https://www.tiktok.com/@vivo.wineclub',
  },
];

const LEGAL = [
  { label: 'Privacy Policy',   href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy',    href: '#' },
];

export default function Footer() {
  return (
    <footer>

      {/* ── CONTACT US ── */}
      <div className="bg-[#731515] px-6 lg:px-16 py-12">
        <div className="max-w-7xl mx-auto">

          {/* Two-column: description + contact rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

            {/* Left */}
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="text-[10px] tracking-[0.5em] text-white/50 mb-4">GET IN TOUCH</div>
                <h2
                  className="text-[clamp(2.4rem,5vw,4rem)] font-light text-white leading-none mb-4"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  Contact Us
                </h2>
                <div className="w-12 h-px bg-white/25 mb-4" />
                <p
                  className="text-sm text-white/65 font-light leading-relaxed max-w-sm"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Interested in joining, partnering, or simply learning more about what we do?
                  Reach out through any of the channels below.
                </p>
              </div>

              </div>

            {/* Right: contact rows */}
            <div className="flex flex-col divide-y divide-white/10">
              {CONTACTS.map(({ Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-center gap-5 py-4 hover:pl-2 transition-all duration-300"
                >
                  <span className="w-9 h-9 border border-white/20 flex items-center justify-center text-white/60 group-hover:border-white/50 group-hover:text-white transition-all duration-300 shrink-0">
                    <Icon />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] tracking-[0.4em] text-white/45 mb-0.5">{label}</div>
                    <div
                      className="text-sm text-white/80 group-hover:text-white transition-colors duration-300"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {value}
                    </div>
                  </div>
                  <span className="text-white/25 group-hover:text-white/60 transition-colors duration-300 text-lg">→</span>
                </a>
              ))}
            </div>

          </div>

          {/* Logo + nav — mobile: logo left / nav right on same row; desktop: nav centred */}
          <div className="mt-8 pt-5 flex items-center gap-6">
            <Image
              src="/logobianco.png"
              alt="Vivo Wine Club"
              width={120}
              height={80}
              className="opacity-70 shrink-0"
            />

            {/* Mobile: vertical nav stacked to the right of the logo */}
            <div className="flex sm:hidden flex-col items-end gap-2 ml-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[10px] tracking-[0.25em] text-white/50 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {link.label.toUpperCase()}
                </Link>
              ))}
            </div>

            {/* Desktop: nav centred between logo and matching spacer */}
            <div className="hidden sm:flex flex-1 flex-wrap justify-center gap-x-8 gap-y-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[10px] tracking-[0.3em] text-white/50 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {link.label.toUpperCase()}
                </Link>
              ))}
            </div>
            {/* Spacer balances logo width on desktop */}
            <div style={{ width: 120 }} className="hidden sm:block shrink-0" />
          </div>


        </div>
      </div>

      {/* ── COPYRIGHT ── */}
      <div className="bg-[#731515] px-6 lg:px-16 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-white/30">
          <span style={{ fontFamily: 'var(--font-nunito)' }}>
            © {new Date().getFullYear()} Vivo Wine Club · All rights reserved
          </span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {LEGAL.map((l, i) => (
              <span key={l.label} className="flex items-center gap-4">
                <Link href={l.href} className="hover:text-white/60 transition-colors duration-200">{l.label}</Link>
                {i < LEGAL.length - 1 && <span className="text-white/15">|</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
