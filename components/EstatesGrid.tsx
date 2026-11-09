'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Le cantine del club.
 *
 * Prima questa griglia univa due elenchi: trentaquattro cantine
 * scritte dentro il codice e quelle del database, tenendo le prime e
 * scartando le omonime. Il risultato era che ciò che si correggeva
 * dall'area riservata — nome, regione, logo — non arrivava mai qui.
 * La fonte adesso è una, `/api/wineries`, la stessa che riempie la
 * mappa e le schede.
 */

interface Winery {
  slug: string;
  name: string;
  region: string | null;
  country: string | null;
  logo_url: string | null;
  classification: string | null;
  visit_date: string | null;
}

/** Barolo e Barbaresco vivono nelle Langhe: nel filtro stanno insieme. */
function regionGroup(region: string | null): string {
  const r = (region ?? '').trim();
  if (!r) return 'Altre';
  if (/barolo|barbaresco|langhe/i.test(r)) return 'Langhe';
  return r;
}

export default function EstatesGrid({ limit, initialRegion }: { limit?: number; initialRegion?: string }) {
  const t = useTranslations('eventsHub');
  const tCommon = useTranslations('common');
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [regionFilter, setRegionFilter] = useState(initialRegion ?? 'all');

  useEffect(() => {
    fetch('/api/wineries')
      .then((r) => r.json())
      .then((j) => { if (Array.isArray(j.wineries)) setWineries(j.wineries as Winery[]); })
      .catch(() => {});
  }, []);

  const regions = useMemo(() => {
    const set = new Set<string>();
    wineries.forEach((w) => set.add(regionGroup(w.region)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [wineries]);

  const filtered = useMemo(
    () =>
      regionFilter === 'all'
        ? wineries
        : wineries.filter((w) => regionGroup(w.region) === regionFilter),
    [wineries, regionFilter],
  );

  const visible = limit ? filtered.slice(0, limit) : filtered;
  const seeMoreHref = regionFilter === 'all' ? '/wineries' : `/wineries?region=${encodeURIComponent(regionFilter)}`;

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {['all', ...regions].map((r) => (
          <button
            key={r}
            onClick={() => setRegionFilter(r)}
            className={`min-h-[44px] rounded-full border px-5 text-[12px] font-medium transition-all duration-200 ${
              regionFilter === r
                ? 'border-accent bg-accent text-paper'
                : 'border-rule-paper text-on-paper-muted hover:border-accent/50 hover:text-accent'
            }`}
          >
            {(r === 'all' ? t('filterAll') : r).toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((w, i) => (
          <motion.div
            key={w.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.55, delay: (i % 8) * 0.06 }}
          >
            <Link
              href={`/wineries/${w.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-rule-paper bg-paper transition-all duration-300 hover:border-accent/50"
            >
              <div className="flex h-28 items-center justify-center bg-paper-soft px-6 transition-colors duration-300 group-hover:bg-paper">
                {w.logo_url ? (
                  <Image
                    src={w.logo_url}
                    alt={w.name}
                    width={160}
                    height={80}
                    // `mix-blend-multiply`: diversi loghi arrivano come
                    // jpg su fondo bianco, e il riquadro qui sotto e'
                    // carta calda — senza, si vedrebbe un rettangolo
                    // bianco attorno al segno. Cosi' il bianco sparisce
                    // e i png trasparenti non se ne accorgono.
                    className="h-20 w-full object-contain mix-blend-multiply"
                    sizes="(max-width: 768px) 45vw, 200px"
                  />
                ) : (
                  <span className="ds-display text-[22px] text-accent/50 transition-opacity group-hover:opacity-80">
                    {w.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 px-4 py-4">
                <p className="text-body font-medium leading-tight transition-colors group-hover:text-accent">
                  {w.name}
                </p>
                {(w.region || w.country) && (
                  <p className="text-fine text-on-paper-muted">
                    {[w.region, w.country].filter(Boolean).join(' · ')}
                  </p>
                )}
                {w.classification && (
                  <p className="line-clamp-1 text-[11px] leading-tight text-accent/60">{w.classification}</p>
                )}
                {w.visit_date && (
                  <p className="mt-auto pt-2 text-[11px] text-accent">Visitata dal club</p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {limit && filtered.length > visible.length && (
        <div className="mt-10 flex justify-center">
          <Link
            href={seeMoreHref}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-rule-paper px-6 text-fine font-medium transition-colors duration-200 hover:border-accent/50 hover:text-accent"
          >
            {tCommon('exploreMore')}
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </>
  );
}
