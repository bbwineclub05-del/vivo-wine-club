'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const NAV_LINKS = [
  { href: '#eventi', label: 'EVENTI' },
  { href: '#cantine', label: 'CANTINE' },
  { href: '#boutique', label: 'BOUTIQUE' },
];

function scrollTo(href: string) {
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, setIsOpen } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0a0204]/90 backdrop-blur-xl border-b border-[#C9A84C]/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[76px] flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-3 group"
          >
            <div className="w-8 h-8 relative">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M16 2C16 2 8 8 8 16C8 20.4 11.6 24 16 24C20.4 24 24 20.4 24 16C24 8 16 2 16 2Z" fill="#722F37" opacity="0.8"/>
                <path d="M16 24V30" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M11 30H21" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="16" cy="14" r="3" fill="#C9A84C" opacity="0.6"/>
              </svg>
            </div>
            <div>
              <div
                className="text-xl font-semibold tracking-[0.35em] text-[#F5EEE6] group-hover:text-[#C9A84C] transition-colors duration-300"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                VIVO
              </div>
              <div className="text-[9px] tracking-[0.6em] text-[#C9A84C] -mt-0.5 font-light">
                WINE CLUB
              </div>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="relative text-[11px] tracking-[0.3em] text-[#C4B5A0] hover:text-[#C9A84C] transition-colors duration-300 group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#C9A84C] group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          {/* Cart + hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 text-[#C4B5A0] hover:text-[#C9A84C] transition-colors"
              aria-label="Carrello"
            >
              <ShoppingBag size={20} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#722F37] rounded-full text-[10px] text-white flex items-center justify-center font-bold"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 text-[#C4B5A0] hover:text-[#C9A84C] transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
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
            className="fixed top-[76px] left-0 right-0 z-40 bg-[#0a0204]/95 backdrop-blur-xl border-b border-[#C9A84C]/20 md:hidden"
          >
            <div className="px-8 py-8 flex flex-col gap-7">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => { setMobileOpen(false); scrollTo(link.href); }}
                  className="text-left text-[11px] tracking-[0.4em] text-[#C4B5A0] hover:text-[#C9A84C] transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
