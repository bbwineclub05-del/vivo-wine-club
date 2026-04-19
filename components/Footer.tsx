'use client';

import { motion } from 'framer-motion';
import { Camera, Hash, Globe, Mail, MapPin, Phone } from 'lucide-react';

const LINKS = {
  'CLUB': [
    { label: 'Chi Siamo', href: '#' },
    { label: 'Come Funziona', href: '#' },
    { label: 'Membership', href: '#boutique' },
    { label: 'FAQ', href: '#' },
  ],
  'ESPERIENZE': [
    { label: 'Eventi', href: '#eventi' },
    { label: 'Tour Cantine', href: '#eventi' },
    { label: 'Masterclass', href: '#eventi' },
    { label: 'Cantine Visitate', href: '#cantine' },
  ],
  'LEGALE': [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Termini di Servizio', href: '#' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'Diritto di Recesso', href: '#' },
  ],
};

const SOCIALS = [
  { icon: Camera, label: 'Instagram', href: '#' },
  { icon: Hash, label: 'TikTok', href: '#' },
  { icon: Globe, label: 'Website', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-[#080103] border-t border-[#C9A84C]/10 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Top section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10">
                  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path d="M16 2C16 2 8 8 8 16C8 20.4 11.6 24 16 24C20.4 24 24 20.4 24 16C24 8 16 2 16 2Z" fill="#722F37" opacity="0.8"/>
                    <path d="M16 24V30" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M11 30H21" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="16" cy="14" r="3" fill="#C9A84C" opacity="0.6"/>
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-[0.35em] text-[#F5EEE6]" style={{ fontFamily: 'var(--font-playfair)' }}>
                    VIVO
                  </div>
                  <div className="text-[9px] tracking-[0.6em] text-[#C9A84C] -mt-1">WINE CLUB</div>
                </div>
              </div>

              <p
                className="text-[#C4B5A0] text-base leading-relaxed mb-8 max-w-xs font-light italic"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                Il club esclusivo per gli amanti del vino. Esperienze enologiche d&apos;eccezione, cantine leggendarie e una comunità di veri appassionati.
              </p>

              {/* Contact */}
              <div className="flex flex-col gap-3 text-xs text-[#C4B5A0]">
                <a href="mailto:info@vivoweineclub.it" className="flex items-center gap-2 hover:text-[#C9A84C] transition-colors">
                  <Mail size={13} className="text-[#C9A84C]" />
                  info@vivowineclub.it
                </a>
                <a href="tel:+390212345678" className="flex items-center gap-2 hover:text-[#C9A84C] transition-colors">
                  <Phone size={13} className="text-[#C9A84C]" />
                  +39 02 1234 5678
                </a>
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-[#C9A84C] mt-0.5 shrink-0" />
                  Via Montenapoleone 8, Milano
                </div>
              </div>
            </motion.div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([title, links], colIdx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: colIdx * 0.1 }}
            >
              <h4 className="text-[9px] tracking-[0.5em] text-[#C9A84C] mb-5">{title}</h4>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors duration-200"
                      style={{ fontFamily: 'var(--font-cormorant)' }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Newsletter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass-card p-8 mb-16 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between"
        >
          <div>
            <h4 className="text-[9px] tracking-[0.5em] text-[#C9A84C] mb-2">NEWSLETTER</h4>
            <p className="text-lg text-[#F5EEE6] font-light italic" style={{ fontFamily: 'var(--font-cormorant)' }}>
              Ricevi in anteprima gli eventi e le selezioni esclusive
            </p>
          </div>
          <div className="flex gap-0 w-full md:w-auto md:min-w-[380px]">
            <input
              type="email"
              placeholder="La tua email"
              className="flex-1 bg-[#0d0306] border border-[#C9A84C]/20 text-[#F5EEE6] px-5 py-3.5 text-sm placeholder:text-[#C4B5A0]/40 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            />
            <button className="px-6 py-3.5 bg-[#722F37] text-[#F5EEE6] text-[10px] tracking-[0.3em] hover:bg-[#8B3A44] transition-colors whitespace-nowrap">
              ISCRIVITI
            </button>
          </div>
        </motion.div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#C9A84C]/10">
          <p className="text-xs text-[#C4B5A0]/50">
            © {new Date().getFullYear()} Vivo Wine Club S.r.l. · Tutti i diritti riservati · P.IVA 12345678901
          </p>

          <div className="flex items-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-8 h-8 border border-[#C9A84C]/20 flex items-center justify-center text-[#C4B5A0] hover:border-[#C9A84C]/60 hover:text-[#C9A84C] transition-all duration-300"
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
