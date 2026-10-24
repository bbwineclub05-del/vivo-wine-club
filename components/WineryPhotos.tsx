'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

/**
 * Le foto di una visita.
 *
 * Prima, quando non c'erano foto, la pagina mostrava otto riquadri
 * tratteggiati con scritto "PHOTO 01 … PHOTO 08" e "coming soon": otto
 * promesse vuote che occupavano mezzo schermo. Una cantina senza foto
 * semplicemente non ha questa sezione.
 */

interface Photo {
  url: string;
  name: string;
}

export default function WineryPhotos({ slug }: { slug: string }) {
  const t = useTranslations('winery');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let annullato = false;
    fetch(`/api/media?folder=wineries/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (!annullato) setPhotos(d.images ?? []); })
      .catch(() => {})
      .finally(() => { if (!annullato) setLoading(false); });
    return () => { annullato = true; };
  }, [slug]);

  const chiudi = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') chiudi();
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? null : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, photos.length, chiudi]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-paper-soft" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) return null;

  return (
    <>
      <h2 className="ds-display mb-5 text-[26px] leading-none tracking-[-0.02em]">
        {t('theVisit')}
        <span className="ds-numeric ml-3 text-[15px] font-normal text-on-paper-muted">{photos.length}</span>
      </h2>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.url}
            onClick={() => setOpen(i)}
            className="group aspect-[4/3] overflow-hidden rounded-xl bg-paper-soft"
            aria-label={`Foto ${i + 1} di ${photos.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/95 p-4"
          onClick={chiudi}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={chiudi}
            aria-label="Chiudi"
            className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full text-on-ink hover:bg-ink-soft"
          >
            <X size={22} strokeWidth={1.8} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[open].url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88dvh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
