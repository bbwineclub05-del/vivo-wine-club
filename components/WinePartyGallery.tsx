'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

const PARTY_GALLERY = [
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
];

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

/**
 * Wine Party photo gallery — used both as a capped preview inside the
 * Events hub (`limit` set) and as the full gallery at /events/party
 * (no `limit`, every photo shown).
 */
export default function WinePartyGallery({ limit }: { limit?: number }) {
  const t       = useTranslations('wineParty');
  const tCommon = useTranslations('common');
  const [gallery, setGallery]   = useState(PARTY_GALLERY);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    fetch('/api/media?folder=wine-party')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.images) && data.images.length > 0) {
          const dynamicImgs = data.images.map((img: { url: string }, i: number) => ({
            id: -1 - i,
            src: img.url,
            alt: `Wine Party — uploaded photo ${i + 1}`,
          }));
          setGallery([...dynamicImgs, ...PARTY_GALLERY]);
        }
      })
      .catch(() => {/* keep static gallery */});
  }, []);

  const visible = limit ? gallery.slice(0, limit) : gallery;

  return (
    <>
      {lightbox && <Lightbox {...lightbox} onClose={() => setLightbox(null)} />}

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-6">
        <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('gallery')}</div>
        <h3 className="text-[clamp(1.6rem,3.5vw,2.8rem)] font-light leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
          {t('theNights')}
        </h3>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visible.map((photo, i) => (
          <motion.button
            key={photo.id}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setLightbox({ src: photo.src, alt: photo.alt })}
            className={`relative overflow-hidden rounded-xl cursor-zoom-in aspect-square ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </motion.button>
        ))}
      </div>

      {limit && gallery.length > limit && (
        <div className="flex justify-center mt-8">
          <Link
            href="/events/party"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white border border-white/25 px-6 py-3 rounded-lg hover:bg-white/10 hover:border-white/50 transition-all duration-300"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {tCommon('exploreMore')}
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </>
  );
}
