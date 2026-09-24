'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

/**
 * Partner photo gallery — reads from media/partners/{slug}, uploaded via
 * Team Management → Gestione Media → Partner. Renders nothing until photos
 * actually exist, so a partner with no photos yet shows no empty section.
 */
export default function PartnerGallery({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations('partners');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/media?folder=${encodeURIComponent(`partners/${slug}`)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.images)) {
          setImages(data.images.map((img: { url: string }) => img.url));
        }
      })
      .catch(() => {/* keep hidden */});
  }, [slug]);

  if (images.length === 0) return null;

  return (
    <section className="relative overflow-hidden pb-20 md:pb-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16" />

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 lg:gap-20 items-start">
          <div>
            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('galleryLabel')}</div>
            <h2 className="text-xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {t('galleryHeading')}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.slice(0, 8).map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={src}
                  alt={`${name} — foto ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 45vw, 180px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
