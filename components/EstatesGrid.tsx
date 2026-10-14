'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { WINERIES, type Winery } from '@/lib/wineries';

interface DbWinery {
  slug: string;
  name: string;
  logo_url: string | null;
  region: string;
  country: string;
}

/**
 * Normalizes free-text region values before grouping: trims stray whitespace
 * (some DB-entered wineries have trailing spaces), groups Barolo/Barbaresco
 * under one Langhe filter, and collapses any Bolgheri variant (e.g. "Toscana,
 * Bolgheri") into a single "Bolgheri" filter.
 */
function regionGroup(region: string): string {
  const trimmed = region.trim();
  if (trimmed === 'Barolo' || trimmed === 'Barbaresco') return 'Barolo & Barbaresco';
  if (/bolgheri/i.test(trimmed)) return 'Bolgheri';
  return trimmed;
}

/**
 * Estate / winery credibility grid, filterable by region.
 * Used both as a capped preview inside the Events hub (`limit` set) and as
 * the full listing at /wineries (no `limit`, every estate shown).
 */
export default function EstatesGrid({ limit, initialRegion }: { limit?: number; initialRegion?: string }) {
  const t       = useTranslations('eventsHub');
  const tCommon = useTranslations('common');
  const [dbWineries, setDbWineries] = useState<DbWinery[]>([]);
  const [regionFilter, setRegionFilter] = useState(initialRegion ?? 'all');

  useEffect(() => {
    fetch('/api/wineries')
      .then((r) => r.json())
      .then((j) => { if (Array.isArray(j.wineries)) setDbWineries(j.wineries as DbWinery[]); })
      .catch(() => {});
  }, []);

  const hardcodedSlugs  = new Set(WINERIES.map((w) => w.slug));
  const extraDbWineries = dbWineries.filter((w) => !hardcodedSlugs.has(w.slug));

  const regions = useMemo(() => {
    const set = new Set<string>();
    WINERIES.forEach((w) => set.add(regionGroup(w.region)));
    extraDbWineries.forEach((w) => { if (w.region) set.add(regionGroup(w.region)); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [extraDbWineries]);

  const filteredWineries = regionFilter === 'all'
    ? WINERIES
    : WINERIES.filter((w) => regionGroup(w.region) === regionFilter);
  const filteredExtra = regionFilter === 'all'
    ? extraDbWineries
    : extraDbWineries.filter((w) => regionGroup(w.region) === regionFilter);

  const total   = filteredWineries.length + filteredExtra.length;
  const visibleWineries = limit ? filteredWineries.slice(0, limit) : filteredWineries;
  const visibleExtra    = limit ? filteredExtra.slice(0, Math.max(0, limit - visibleWineries.length)) : filteredExtra;
  const shownCount = visibleWineries.length + visibleExtra.length;

  const seeMoreHref = regionFilter === 'all' ? '/wineries' : `/wineries?region=${encodeURIComponent(regionFilter)}`;

  return (
    <>
      {/* Region filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {['all', ...regions].map((r) => (
          <button
            key={r}
            onClick={() => setRegionFilter(r)}
            className={`min-h-[44px] px-5 text-[12px] font-medium rounded-full border transition-all duration-200 ${
              regionFilter === r
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-paper)]'
                : 'border-[var(--color-rule-paper)] text-[var(--color-on-paper-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]'
            }`}
            style={{ fontFamily: 'var(--font-geist)' }}
          >
            {(r === 'all' ? t('filterAll') : r).toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleWineries.map((winery: Winery, i) => (
          <motion.div
            key={winery.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.55, delay: (i % 8) * 0.06 }}
          >
            <Link
              href={`/wineries/${winery.slug}`}
              className="group flex flex-col bg-white border border-[var(--color-rule-paper)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/50 transition-all duration-300"
            >
              <div className="flex items-center justify-center h-28 px-6 bg-gray-50 group-hover:bg-white transition-colors duration-300">
                {winery.logo ? (
                  <Image
                    src={winery.logo}
                    alt={winery.name}
                    width={160}
                    height={80}
                    className="w-full h-20 object-contain transition-all duration-300"
                    sizes="(max-width: 768px) 45vw, 200px"
                  />
                ) : (
                  <div className="text-[var(--color-accent)] text-2xl font-light tracking-widest opacity-50 group-hover:opacity-80 transition-opacity" style={{ fontFamily: 'var(--font-syne)' }}>
                    {winery.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 px-4 py-4">
                <p className="text-[var(--color-ink)] text-sm font-medium leading-tight group-hover:text-[var(--color-accent)] transition-colors" style={{ fontFamily: 'var(--font-syne)' }}>
                  {winery.name}
                </p>
                <p className="text-[var(--color-on-paper-muted)] text-[11px] tracking-wide">
                  {winery.region} · {winery.country}
                </p>
                {winery.classification && (
                  <p className="text-[var(--color-accent)]/60 text-[10px] tracking-wide mt-0.5 leading-tight line-clamp-1">
                    {winery.classification}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}

        {visibleExtra.map((winery, i) => (
          <motion.div
            key={winery.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.55, delay: (i % 8) * 0.06 }}
          >
            <Link
              href={`/wineries/${winery.slug}`}
              className="group flex flex-col bg-white border border-[var(--color-rule-paper)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/50 transition-all duration-300"
            >
              <div className="flex items-center justify-center h-28 px-6 bg-gray-50 group-hover:bg-white transition-colors duration-300">
                {winery.logo_url ? (
                  <Image
                    src={winery.logo_url}
                    alt={winery.name}
                    width={160}
                    height={80}
                    className="w-full h-20 object-contain transition-all duration-300"
                    sizes="(max-width: 768px) 45vw, 200px"
                  />
                ) : (
                  <div className="text-[var(--color-accent)] text-2xl font-light tracking-widest opacity-50 group-hover:opacity-80 transition-opacity" style={{ fontFamily: 'var(--font-syne)' }}>
                    {winery.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 px-4 py-4">
                <p className="text-[var(--color-ink)] text-sm font-medium leading-tight group-hover:text-[var(--color-accent)] transition-colors" style={{ fontFamily: 'var(--font-syne)' }}>
                  {winery.name}
                </p>
                {(winery.region || winery.country) && (
                  <p className="text-[var(--color-on-paper-muted)] text-[11px] tracking-wide">
                    {[winery.region, winery.country].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {limit && total > shownCount && (
        <div className="flex justify-center mt-10">
          <Link
            href={seeMoreHref}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[var(--color-rule-paper)] px-6 text-[13px] font-medium text-[var(--color-ink)] transition-colors duration-200 hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-geist)' }}
          >
            {tCommon('exploreMore')}
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </>
  );
}
