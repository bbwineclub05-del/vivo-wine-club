'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, X } from 'lucide-react';
import BackButton from '@/components/BackButton';

/* ── Gallery photos ── */
const GALLERY = [
  { id: 1,  src: '/events/Winery visits/wv1.jpg',  alt: 'Winery Visit — photo 1' },
  { id: 2,  src: '/events/Winery visits/wv2.jpg',  alt: 'Winery Visit — photo 2' },
  { id: 3,  src: '/events/Winery visits/wv3.jpg',  alt: 'Winery Visit — photo 3' },
  { id: 4,  src: '/events/Winery visits/wv4.jpg',  alt: 'Winery Visit — photo 4' },
  { id: 5,  src: '/events/Winery visits/wv5.jpg',  alt: 'Winery Visit — photo 5' },
  { id: 6,  src: '/events/Winery visits/wv6.jpg',  alt: 'Winery Visit — photo 6' },
  { id: 7,  src: '/events/Winery visits/wv7.jpg',  alt: 'Winery Visit — photo 7' },
  { id: 8,  src: '/events/Winery visits/wv8.jpg',  alt: 'Winery Visit — photo 8' },
  { id: 9,  src: '/events/Winery visits/wv9.jpg',  alt: 'Winery Visit — photo 9' },
  { id: 10, src: '/events/Winery visits/wv10.jpg', alt: 'Winery Visit — photo 10' },
];

const UPCOMING = [
  {
    month: 'MAY', day: '12',
    title: 'Wine Visit · Speri',
    location: 'Speri, Pedemonte, Valpolicella — ore 11:00',
    price: 0,
    slug: 'winery-visit-speri-may-2026',
  },
  {
    month: 'MAY', day: '12',
    title: 'Wine Visit · Bertani',
    location: 'Bertani, Grezzana, Valpolicella — ore 15:00',
    price: 0,
    slug: 'winery-visit-bertani-may-2026',
  },
];

const PILLS = ['Private Access', 'Expert Guides', 'Iconic Estates'];

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors z-10"
        aria-label="Close"
      >
        <X size={24} />
      </button>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-5xl max-h-[85vh] w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image src={src} alt={alt} fill className="object-contain" sizes="90vw" />
      </motion.div>
    </motion.div>
  );
}

export default function WineryVisitsPage() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  return (
    <>
      <AnimatePresence>
        {lightbox && <Lightbox {...lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      <div className="bg-[#1A2E5C] min-h-screen text-[#F5EEE6]">

        {/* ── 1. HERO ── */}
        <section className="relative h-screen flex flex-col justify-end overflow-hidden">
          <Image
            src="/events/Winery visits/wv5.jpg"
            alt="Winery Visits"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="absolute top-[130px] left-8 z-10"
          >
            <BackButton className="flex items-center gap-2 text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors duration-300 text-[10px] tracking-[0.35em]" />
          </motion.div>

          <div className="relative z-10 px-8 md:px-16 pb-14 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-[10px] tracking-[0.55em] text-[#C9A84C] mb-4"
            >
              VIVO WINE CLUB · EXPERIENCE
            </motion.div>

            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-[clamp(3.5rem,9vw,8rem)] font-light leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Winery Visits
              </motion.h1>
            </div>

            <div className="overflow-hidden mt-3">
              <motion.p
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="text-xl md:text-2xl text-[#C4B5A0] font-light italic"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Behind the bottle, behind the vines.
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          >
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown size={18} className="text-[#731515]" />
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. CONCEPT ── */}
        <section className="py-16 md:py-22 bg-[#162549]">
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-5">THE CONCEPT</div>
              <p
                className="text-xl md:text-2xl text-[#C4B5A0] font-light leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                There is no better way to understand a wine than to stand in the vineyard where it was born.
                We organise private visits to iconic estates — cellars, barrel rooms, and guided tastings
                with the people who make the wine. Small groups, real access, no tourist traps.
              </p>
            </motion.div>

            <div className="flex flex-wrap gap-4 mt-10">
              {PILLS.map((pill, i) => (
                <motion.div
                  key={pill}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="px-6 py-3 border border-[#731515]/40 text-[#731515] text-[11px] tracking-[0.35em] rounded-full"
                >
                  {pill}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. GALLERY ── */}
        <section className="py-14 bg-[#101D3A]">
          <div className="max-w-7xl mx-auto px-8 md:px-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mb-8"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">GALLERY</div>
              <h2
                className="text-[clamp(2rem,4vw,3.5rem)] font-light text-[#F5EEE6] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                THE VISITS
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {GALLERY.map((photo, i) => (
                <motion.button
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.55, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setLightbox({ src: photo.src, alt: photo.alt })}
                  className={`relative overflow-hidden rounded-xl cursor-zoom-in aspect-square ${
                    i === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300" />
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. NEXT VISITS ── */}
        <section className="py-16 md:py-22 bg-[#162549]">
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-10"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">UPCOMING</div>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                NEXT VISITS
              </h2>
            </motion.div>

            <div className="flex flex-col">
              {UPCOMING.map((event, i) => (
                <motion.div
                  key={event.slug}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-6 md:gap-10 py-6 group">
                    <div className="flex flex-col items-end w-14 shrink-0">
                      <span className="text-[8px] tracking-[0.4em] text-[#C9A84C] mb-0.5">{event.month}</span>
                      <span
                        className="text-[2.8rem] font-light leading-none text-[#F5EEE6] group-hover:text-[#731515] transition-colors duration-300"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {event.day}
                      </span>
                    </div>

                    <div className="w-px self-stretch bg-[#731515]/20 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-base md:text-lg font-medium text-[#F5EEE6] group-hover:text-[#731515] transition-colors duration-300 mb-1"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#C4B5A0]">
                        <MapPin size={10} className="text-[#731515] shrink-0" />
                        <span>{event.location}</span>
                        <span className="text-[#731515]/40 mx-0.5">·</span>
                        <span>Free</span>
                      </div>
                    </div>

                    <Link
                      href={`/checkout/${event.slug}`}
                      className="shrink-0 hidden sm:inline-flex text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#731515] text-[#F5EEE6] border border-[#731515] hover:bg-[#aa4848] hover:border-[#aa4848] transition-all duration-300 whitespace-nowrap"
                    >
                      GET YOUR FREE TICKET
                    </Link>
                  </div>

                  <div className="sm:hidden pb-4 pl-20">
                    <Link
                      href={`/checkout/${event.slug}`}
                      className="inline-flex text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#731515] text-[#F5EEE6] border border-[#731515] hover:bg-[#aa4848] transition-all duration-300 whitespace-nowrap"
                    >
                      GET YOUR FREE TICKET
                    </Link>
                  </div>

                  {i < UPCOMING.length - 1 && <div className="h-px bg-[#731515]/10" />}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. CLOSING ── */}
        <section className="py-14 md:py-20 bg-[#101D3A] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(115,21,21,0.12),transparent_65%)] pointer-events-none" />
          <div className="max-w-2xl mx-auto px-8 md:px-16 text-center relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Reserve your spot early.
            </motion.h2>
          </div>
        </section>

      </div>
    </>
  );
}
