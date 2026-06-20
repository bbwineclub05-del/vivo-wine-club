'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface GalleryImage {
  url:  string;
  name: string;
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
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
          className="absolute top-6 right-6 text-[#C4B5A0] hover:text-white transition-colors z-10"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full h-full object-contain" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Placeholder cell ── */
function PhotoPlaceholder({ index }: { index: number }) {
  return (
    <div className="aspect-square border border-dashed border-[#e8d5d5] bg-[#fdf8f8] flex flex-col items-center justify-center gap-3 text-[#9a6060]/50 rounded-lg">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span className="text-[9px] tracking-[0.3em]">PHOTO {String(index + 1).padStart(2, '0')}</span>
    </div>
  );
}

export default function WineryGallery({ slug }: { slug: string }) {
  const [images,   setImages]   = useState<GalleryImage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/media?folder=wineries/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setImages(data.images ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-[#f5f0f0] border border-[#e8d5d5] animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <>
        <p className="text-sm text-[#7a4a4a]/60 italic pb-1 mb-6" style={{ fontFamily: 'var(--font-nunito)' }}>
          Photos and stories coming soon.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <PhotoPlaceholder key={i} index={i} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {images.map((img, i) => (
          <motion.button
            key={img.url}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setLightbox(img.url)}
            className="relative aspect-square overflow-hidden cursor-zoom-in border border-[#e8d5d5] rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors duration-300" />
          </motion.button>
        ))}
      </div>
    </>
  );
}
