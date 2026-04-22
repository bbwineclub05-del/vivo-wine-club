'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Camera, Hash, Globe, Mail, MapPin, Phone } from 'lucide-react';

const LINKS = {
  'CLUB': [
    { label: 'About Us',    href: '#' },
    { label: 'How It Works',href: '#' },
    { label: 'Membership',  href: '#boutique' },
    { label: 'FAQ',         href: '#' },
  ],
  'EXPERIENCES': [
    { label: 'Events',          href: '#eventi' },
    { label: 'Winery Tours',    href: '#eventi' },
    { label: 'Masterclasses',   href: '#eventi' },
    { label: 'Visited Wineries',href: '#cantine' },
  ],
  'LEGAL': [
    { label: 'Privacy Policy',      href: '#' },
    { label: 'Terms of Service',    href: '#' },
    { label: 'Cookie Policy',       href: '#' },
    { label: 'Right of Withdrawal', href: '#' },
  ],
};

const SOCIALS = [
  { icon: Camera, label: 'Instagram', href: '#' },
  { icon: Hash,   label: 'TikTok',    href: '#' },
  { icon: Globe,  label: 'Website',   href: '#' },
];

export default function Footer() {
  const reducedMotion = useReducedMotion();
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <footer className="bg-[#F5E6E6] pt-20 pb-8 relative overflow-hidden">
      <div className="fog-left" style={{ top: '0%', height: '100%', opacity: 0.7 }} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Top section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">

          {/* Brand */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: d(0.7) }}
            >
              <div className="mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Vivo Wine Club" className="h-16 w-auto object-contain" />
              </div>
              <p
                className="text-[#7a4a4a] text-base leading-relaxed mb-8 max-w-xs font-light italic"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                The exclusive club for wine lovers. Exceptional wine experiences, legendary wineries and a community of true enthusiasts.
              </p>
              <div className="flex flex-col gap-3 text-xs text-[#7a4a4a]">
                <a href="mailto:info@vivowineclub.it" className="flex items-center gap-2 hover:text-[#731515] transition-colors">
                  <Mail size={13} className="text-[#731515]" />
                  info@vivowineclub.it
                </a>
                <a href="tel:+390212345678" className="flex items-center gap-2 hover:text-[#731515] transition-colors">
                  <Phone size={13} className="text-[#731515]" />
                  +39 02 1234 5678
                </a>
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-[#731515] mt-0.5 shrink-0" />
                  Via Montenapoleone 8, Milano
                </div>
              </div>
            </motion.div>
          </div>

          {/* Link columns — no motion wrappers, they're below the fold anyway */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[9px] tracking-[0.5em] text-[#731515] mb-5">{title}</h4>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#7a4a4a] hover:text-[#1a0505] transition-colors duration-200"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.7) }}
          className="glass-card p-8 mb-16 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between"
        >
          <div>
            <h4 className="text-[9px] tracking-[0.5em] text-[#731515] mb-2">NEWSLETTER</h4>
            <p className="text-lg text-[#1a0505] font-light italic" style={{ fontFamily: 'var(--font-nunito)' }}>
              Be the first to hear about exclusive events and curated selections
            </p>
          </div>
          <div className="flex gap-0 w-full md:w-auto md:min-w-[380px]">
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 bg-white border border-[#e8d5d5] text-[#1a0505] px-5 py-3.5 text-sm placeholder:text-[#7a4a4a]/50 focus:outline-none focus:border-[#731515]/50 transition-colors"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
            <button className="px-6 py-3.5 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#aa4848] transition-colors whitespace-nowrap">
              SUBSCRIBE
            </button>
          </div>
        </motion.div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-xs text-[#7a4a4a]/60">
            © {new Date().getFullYear()} Vivo Wine Club S.r.l. · All rights reserved · VAT 12345678901
          </p>
          <div className="flex items-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-8 h-8 border border-[#e8d5d5] flex items-center justify-center text-[#7a4a4a] hover:border-[#731515]/50 hover:text-[#731515] transition-all duration-300"
              >
                <s.icon size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
