'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import BackButton from '@/components/BackButton';
import ExperienceUpcoming from '@/components/ExperienceUpcoming';
import { useTranslations } from 'next-intl';

const PILL_KEYS = ['pill1', 'pill2', 'pill3'] as const;

const STATIC_GALLERY = [
  '/events/wine lounge 1.jpg',
  '/events/wine lounge 2.jpg',
  '/events/wine lounge 3.jpg',
  '/events/wine lounge 4.jpg',
  '/events/wine lounge 5.jpg',
];

export default function WineLoungeePage() {
  const t = useTranslations('wineLounge');
  const [gallery, setGallery] = useState<string[]>(STATIC_GALLERY);

  useEffect(() => {
    fetch('/api/media?folder=wine-lounge')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.images) && data.images.length > 0) {
          setGallery([...data.images.map((img: { url: string }) => img.url), ...STATIC_GALLERY]);
        }
      })
      .catch(() => {/* keep static */});
  }, []);

  return (
    <div className="bg-[#3d1010] min-h-screen text-[#F5EEE6]">

      {/* ── 1. HERO ── */}
      <section className="relative h-screen flex flex-col justify-end overflow-hidden">
        <Image
          src="/events/bottiglie.jpg"
          alt="Wine Lounge"
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
              className="text-[clamp(2.5rem,9vw,8rem)] font-light leading-none"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Wine Lounge
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
            <ChevronDown size={18} className="text-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── 2. UPCOMING LOUNGE EVENTS ── */}
      <section className="py-16 md:py-22 bg-[#2e0c0c]">
        <div className="max-w-4xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-10"
          >
            <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-3">{t('upcoming')}</div>
            <h2
              className="text-[clamp(2rem,5vw,4rem)] font-light text-[#F5EEE6] leading-none mb-8"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {t('nextEvenings')}
            </h2>
            <div className="h-px bg-white/10 mb-8" />
            <ExperienceUpcoming
              section="wine_lounge"
              accentColor="#C9A84C"
              mutedColor="light"
              btnBg="#731515"
              btnText="#F5EEE6"
            />
          </motion.div>
        </div>
      </section>

      {/* ── 3. CONCEPT ── */}
      <section className="py-16 md:py-22 bg-[#2e0c0c]">
        <div className="max-w-4xl mx-auto px-8 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-5">{t('theConcept')}</div>
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
                className="px-6 py-3 border border-white/20 text-white/60 text-[11px] tracking-[0.35em] rounded-full"
              >
                {t(key)}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. GALLERY ── */}
      <section className="py-10 bg-[#2e0c0c]">
        <div className="max-w-4xl mx-auto px-8 md:px-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gallery.map((src, i) => (
              <motion.div
                key={src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative aspect-[4/3] overflow-hidden"
              >
                <Image
                  src={src}
                  alt={`Wine Lounge ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 400px"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CLOSING ── */}
      <section className="py-10 md:py-14 bg-[#240909] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(201,168,76,0.06),transparent_65%)] pointer-events-none" />
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
            className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] bg-[#731515] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#9b2323] transition-colors"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {t('becomeAMember')}
          </motion.a>
        </div>
      </section>

    </div>
  );
}
