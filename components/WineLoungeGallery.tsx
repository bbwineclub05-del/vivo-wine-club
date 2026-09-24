'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

const LOUNGE_GALLERY = [
  '/events/wine lounge 1.jpg',
  '/events/wine lounge 2.jpg',
  '/events/wine lounge 3.jpg',
  '/events/wine lounge 4.jpg',
  '/events/wine lounge 5.jpg',
];

/**
 * Wine Lounge photo gallery — capped preview inside the Events hub
 * (`limit` set), full gallery at /events/lounge (no `limit`).
 */
export default function WineLoungeGallery({ limit }: { limit?: number }) {
  const tCommon = useTranslations('common');
  const [gallery, setGallery] = useState<string[]>(LOUNGE_GALLERY);

  useEffect(() => {
    fetch('/api/media?folder=wine-lounge')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.images) && data.images.length > 0) {
          setGallery([...data.images.map((img: { url: string }) => img.url), ...LOUNGE_GALLERY]);
        }
      })
      .catch(() => {/* keep static */});
  }, []);

  const visible = limit ? gallery.slice(0, limit) : gallery;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
            className="relative aspect-[4/3] overflow-hidden rounded-lg"
          >
            <Image src={src} alt={`Wine Lounge ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 50vw, 400px" />
          </motion.div>
        ))}
      </div>

      {limit && gallery.length > limit && (
        <div className="flex justify-center mt-8">
          <Link
            href="/events/lounge"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white border border-white/20 px-6 py-3 rounded-lg hover:bg-white/10 hover:border-white/50 transition-all duration-300"
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
