'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, MapPin, ChevronDown } from 'lucide-react';

/* ── Gallery photos ── */
const GALLERY = [
  { id: 1,  src: '/events/wine-party1.JPG', alt: 'Wine Party — photo 1' },
  { id: 2,  src: '/events/wine-party2.jpg', alt: 'Wine Party — photo 2' },
  { id: 3,  src: '/events/wine-party3.jpg', alt: 'Wine Party — photo 3' },
  { id: 4,  src: '/events/wine-party4.jpg', alt: 'Wine Party — photo 4' },
  { id: 5,  src: '/events/wine-party5.jpg', alt: 'Wine Party — photo 5' },
  { id: 6,  src: '/events/wine-party6.jpg', alt: 'Wine Party — photo 6' },
  { id: 7,  src: '/events/wine-party7.jpg', alt: 'Wine Party — photo 7' },
  { id: 8,  src: '/events/wine-party8.jpg', alt: 'Wine Party — photo 8' },
  { id: 9,  src: '/events/wine-party9.jpg', alt: 'Wine Party — photo 9' },
  { id: 10, src: '/events/wine-party10.JPG', alt: 'Wine Party — photo 10' },
  { id: 11, src: '/events/wine-party11.JPG', alt: 'Wine Party — photo 11' },
];

/* ── Placeholder upcoming events ── */
const UPCOMING = [
  { month: 'MAY', day: '24', title: 'Wine Party #12', location: 'Milan, Italy', price: 30 },
  { month: 'JUN', day: '14', title: 'Wine Party #13', location: 'Florence, Italy', price: 30 },
  { month: 'JUL', day: '5',  title: 'Wine Party #14', location: 'Turin, Italy', price: 30 },
];

/* ── Pills ── */
const PILLS = ['Great Wine', 'Live DJ Set', 'Curated Crowd'];

/* ────────────────────────────── Components ────────────────────────────── */

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
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="90vw"
        />
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────── Page ────────────────────────────── */

export default function WinePartyPage() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notified, setNotified] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    setNotified(true);
    setNotifyEmail('');
  };

  return (
    <>
      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightbox && <Lightbox {...lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      <div className="bg-[#0a0204] min-h-screen text-[#F5EEE6]">

        {/* ── 1. HERO ── */}
        <section className="relative h-screen flex flex-col justify-end overflow-hidden">
          {/* Background image */}
          <Image
            src="/events/wine-party-1.jpg"
            alt="Wine Party"
            fill
            className="object-cover"
            priority
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="absolute top-8 left-8 z-10"
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-[#C4B5A0] hover:text-[#C9A84C] transition-colors text-[11px] tracking-[0.35em]"
            >
              <ArrowLeft size={14} />
              BACK
            </Link>
          </motion.div>

          {/* Hero text */}
          <div className="relative z-10 px-8 md:px-16 pb-20 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-[10px] tracking-[0.55em] text-[#C9A84C] mb-5"
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
                Wine Party
              </motion.h1>
            </div>

            <div className="overflow-hidden mt-4">
              <motion.p
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="text-xl md:text-2xl text-[#C4B5A0] font-light italic"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Where wine meets the night.
              </motion.p>
            </div>
          </div>

          {/* Scroll hint */}
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
              <ChevronDown size={18} className="text-[#C9A84C]" />
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. CONCEPT ── */}
        <section className="py-24 md:py-32 bg-[#0d0203]">
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-6">
                THE CONCEPT
              </div>
              <p
                className="text-xl md:text-2xl text-[#C4B5A0] font-light leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                A Wine Party is not just an event — it&apos;s a vibe. We bring together great bottles,
                a carefully curated DJ set and a crowd that actually cares about what&apos;s in their glass.
                No dress codes, no pretension. Just good wine, good music and good people.
              </p>
            </motion.div>

            {/* ── 3. PILLS ── */}
            <div className="flex flex-wrap gap-4 mt-14">
              {PILLS.map((pill, i) => (
                <motion.div
                  key={pill}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="px-6 py-3 border border-[#C9A84C]/30 text-[#C9A84C] text-[11px] tracking-[0.35em] rounded-full"
                >
                  {pill}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. GALLERY ── */}
        <section className="py-20 bg-[#090103]">
          <div className="max-w-7xl mx-auto px-8 md:px-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mb-12"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">GALLERY</div>
              <h2
                className="text-[clamp(2rem,4vw,3.5rem)] font-light text-[#F5EEE6] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                THE NIGHTS
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

        {/* ── 5. UPCOMING EVENTS ── */}
        <section className="py-24 md:py-32 bg-[#0d0203]">
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-14"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">UPCOMING</div>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                NEXT PARTIES
              </h2>
            </motion.div>

            <div className="flex flex-col">
              {UPCOMING.map((event, i) => (
                <motion.div
                  key={event.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-6 md:gap-10 py-7 group">
                    {/* Date */}
                    <div className="flex flex-col items-end w-14 shrink-0">
                      <span className="text-[8px] tracking-[0.4em] text-[#C9A84C] mb-0.5">
                        {event.month}
                      </span>
                      <span
                        className="text-[2.8rem] font-light leading-none text-[#F5EEE6] group-hover:text-[#C9A84C] transition-colors duration-300"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {event.day}
                      </span>
                    </div>

                    <div className="w-px self-stretch bg-[#C9A84C]/15 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-base md:text-lg font-medium text-[#F5EEE6] group-hover:text-[#C9A84C] transition-colors duration-300 mb-1"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#C4B5A0]">
                        <MapPin size={10} className="text-[#C9A84C] shrink-0" />
                        <span>{event.location}</span>
                        <span className="text-[#C9A84C]/25 mx-0.5">·</span>
                        <span>€{event.price}</span>
                      </div>
                    </div>

                    <button className="shrink-0 hidden sm:block text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#731515] text-[#F5EEE6] border border-[#731515] hover:bg-[#aa4848] hover:border-[#aa4848] transition-all duration-300">
                      BUY TICKETS
                    </button>
                  </div>

                  {/* Mobile button */}
                  <div className="sm:hidden pb-5 pl-20">
                    <button className="text-[9px] tracking-[0.28em] px-5 py-2.5 bg-[#731515] text-[#F5EEE6] border border-[#731515] hover:bg-[#aa4848] transition-all duration-300">
                      BUY TICKETS
                    </button>
                  </div>

                  {i < UPCOMING.length - 1 && (
                    <div className="h-px bg-[#C9A84C]/8" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. NOTIFY CTA ── */}
        <section className="py-24 md:py-32 bg-[#080103] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(115,21,21,0.12),transparent_65%)] pointer-events-none" />

          <div className="max-w-2xl mx-auto px-8 md:px-16 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-5">
                STAY IN THE LOOP
              </div>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-tight mb-5"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Don&apos;t miss the next one.
              </h2>
              <p
                className="text-base text-[#C4B5A0] font-light mb-10"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Drop your email and we&apos;ll let you know when the next Wine Party drops.
              </p>

              <AnimatePresence mode="wait">
                {notified ? (
                  <motion.p
                    key="thanks"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#C9A84C] tracking-widest text-sm"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    You&apos;re on the list. See you there.
                  </motion.p>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleNotify}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      className="flex-1 bg-transparent border border-[#C9A84C]/25 text-[#F5EEE6] placeholder-[#C4B5A0]/40 px-5 py-4 text-sm focus:outline-none focus:border-[#C9A84C]/60 transition-colors duration-300"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    />
                    <button
                      type="submit"
                      className="px-8 py-4 bg-[#731515] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#aa4848] transition-colors duration-300 whitespace-nowrap"
                    >
                      NOTIFY ME
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

      </div>
    </>
  );
}
