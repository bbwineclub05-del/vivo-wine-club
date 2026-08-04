'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import BackButton from '@/components/BackButton';
import ExperienceUpcoming from '@/components/ExperienceUpcoming';
import { useTranslations } from 'next-intl';

/* ── Gallery photos ── */
const GALLERY = [
  { id: 1,  src: '/events/wp1.jpg',          alt: 'Wine Party — photo 1' },
  { id: 2,  src: '/events/wp2.jpg',          alt: 'Wine Party — photo 2' },
  { id: 3,  src: '/events/wp3.jpg',          alt: 'Wine Party — photo 3' },
  { id: 4,  src: '/events/wp4.jpg',          alt: 'Wine Party — photo 4' },
  { id: 5,  src: '/events/wine-party1.JPG',  alt: 'Wine Party — photo 5' },
  { id: 6,  src: '/events/wine-party2.jpg',  alt: 'Wine Party — photo 6' },
  { id: 7,  src: '/events/wine-party3.jpg',  alt: 'Wine Party — photo 7' },
  { id: 8,  src: '/events/wine-party4.jpg',  alt: 'Wine Party — photo 8' },
  { id: 9,  src: '/events/wine-party5.jpg',  alt: 'Wine Party — photo 9' },
  { id: 10, src: '/events/wine-party6.jpg',  alt: 'Wine Party — photo 10' },
  { id: 11, src: '/events/wine-party7.jpg',  alt: 'Wine Party — photo 11' },
  { id: 12, src: '/events/wine-party8.jpg',  alt: 'Wine Party — photo 12' },
  { id: 13, src: '/events/wine-party9.jpg',  alt: 'Wine Party — photo 13' },
  { id: 14, src: '/events/wine-party10.JPG', alt: 'Wine Party — photo 14' },
  { id: 15, src: '/events/wine-party11.JPG', alt: 'Wine Party — photo 15' },
];

const PILL_KEYS = ['pill1', 'pill2', 'pill3'] as const;

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
        className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors z-10"
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

export default function WinePartyPage() {
  const t = useTranslations('wineParty');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [gallery,  setGallery]  = useState(GALLERY);

  useEffect(() => {
    fetch('/api/media?folder=wine-party')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.images) && data.images.length > 0) {
          const dynamic = data.images.map((img: { url: string }, i: number) => ({
            id:  -1 - i,
            src: img.url,
            alt: `Wine Party — uploaded photo ${i + 1}`,
          }));
          setGallery([...dynamic, ...GALLERY]);
        }
      })
      .catch(() => {/* keep static gallery */});
  }, []);

  return (
    <>
      {lightbox && <Lightbox {...lightbox} onClose={() => setLightbox(null)} />}

      <div className="bg-[#0a0204] min-h-screen text-[#F5EEE6]">

        {/* ── 1. HERO ── */}
        <section className="relative h-screen flex flex-col justify-end overflow-hidden bg-[#0a0204]">
          <Image
            src="/events/wp2.jpg"
            alt="Wine Party"
            fill
            className="object-contain"
            priority
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_52%_at_50%_46%,transparent_45%,rgba(10,2,4,0.55)_68%,rgba(10,2,4,0.92)_88%,#0a0204_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0204] via-[#0a0204]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0204]/70 via-transparent to-transparent" />

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
              className="text-[10px] tracking-[0.55em] text-[#731515] mb-4"
            >
              VIVO WINE CLUB · EXPERIENCE
            </motion.div>

            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-[clamp(2.5rem,9vw,8rem)] font-light leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Wine Party and Azul
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
                {t('heroTagline')}
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

        {/* ── 2. UPCOMING EVENTS ── */}
        <section className="py-16 md:py-22 bg-[#0d0203]">
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-10"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('upcoming')}</div>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('nextParties')}
              </h2>
            </motion.div>

            <ExperienceUpcoming
              section="wine_party"
              accentColor="#731515"
              mutedColor="light"
              btnBg="#731515"
              btnText="#F5EEE6"
            />
          </div>
        </section>

        {/* ── 3. CONCEPT ── */}
        <section className="py-16 md:py-22 bg-[#0d0203]">
          <div className="max-w-4xl mx-auto px-8 md:px-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-5">{t('theConcept')}</div>
              <p
                className="text-xl md:text-2xl text-[#C4B5A0] font-light leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('conceptBody')}
              </p>
            </motion.div>

            <div className="flex flex-wrap gap-4 mt-10">
              {PILL_KEYS.map((key, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="px-6 py-3 border border-[#731515]/40 text-[#731515] text-[11px] tracking-[0.35em] rounded-full"
                >
                  {t(key)}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. GALLERY ── */}
        <section className="py-14 bg-[#090103]">
          <div className="max-w-7xl mx-auto px-8 md:px-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mb-8"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('gallery')}</div>
              <h2
                className="text-[clamp(2rem,4vw,3.5rem)] font-light text-[#F5EEE6] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('theNights')}
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gallery.map((photo, i) => (
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

        {/* ── 5. CLOSING ── */}
        <section className="py-10 md:py-14 bg-[#080103] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(115,21,21,0.12),transparent_65%)] pointer-events-none" />
          <div className="max-w-5xl mx-auto px-8 md:px-16 relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light text-[#F5EEE6] leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {t('dontMissNext')}
            </motion.h2>
            <motion.a
              href="/membership"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] bg-[#731515] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#9b2323] transition-colors rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('becomeAMember')}
            </motion.a>
          </div>
        </section>

      </div>
    </>
  );
}
