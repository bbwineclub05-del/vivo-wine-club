'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';

const WineMap = dynamic(() => import('@/components/WineMap'), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full animate-pulse rounded-2xl bg-paper-soft lg:h-[360px]" />,
});

/**
 * Dove si trova la cantina, sulla mappa vera.
 *
 * La stessa mappa dell'area riservata e dell'area socio — una sola
 * implementazione, così una correzione fatta sul pin si vede ovunque.
 * Sotto, il collegamento per farsi portare: su un telefono è la cosa
 * che si usa davvero.
 */
export default function WineryLocation({
  name, lat, lng,
}: {
  name: string;
  lat: number;
  lng: number;
}) {
  const t = useTranslations('winery');

  return (
    <div>
      <h2 className="ds-display mb-5 text-[26px] leading-none tracking-[-0.02em]">{t('whereItIs')}</h2>

      <div className="overflow-hidden rounded-2xl border border-rule-paper">
        <WineMap
          markers={[{ slug: 'questa', name, lat, lng }]}
          selectedSlug="questa"
          // Senza questo la mappa si apre sull'Europa e la cantina è un
          // puntino da cercare: con un solo pin, si parte da lì.
          flyTo={{ lat, lng, zoom: 13, key: 1 }}
          heightClassName="h-[280px] lg:h-[360px]"
        />
      </div>

      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-rule-paper px-5 text-fine font-medium transition-colors hover:border-accent/40"
      >
        {t('openInMaps')}
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
