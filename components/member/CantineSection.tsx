'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ExternalLink, Globe, Mail, MapPin, Phone, Search, X } from 'lucide-react';
import { Head, Panel } from '@/components/member/MemberShell';

const WineMap = dynamic(() => import('@/components/WineMap'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-2xl bg-paper-soft" />,
});

/**
 * Le cantine che conosciamo, con i contatti.
 *
 * È il vantaggio più concreto della tessera e il più difficile da
 * raccontare: una cantina che non risponde a uno sconosciuto risponde
 * a chi arriva dal club. Qui ci sono il telefono, la mail e il link
 * per prenotare — quando ci sono. Dove mancano non si scrive un
 * trattino: semplicemente non c'è la riga.
 */

interface Cantina {
  slug: string;
  name: string;
  region: string | null;
  country: string | null;
  classification: string | null;
  visit_date: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  booking_url: string | null;
  address: string | null;
}

export default function CantineSection() {
  const t = useTranslations('member');
  const [list, setList] = useState<Cantina[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [aperta, setAperta] = useState<string | null>(null);
  const [vola, setVola] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(null);

  const carica = useCallback(async () => {
    try {
      const res = await fetch('/api/wineries');
      const j = await res.json();
      setList(j.wineries ?? []);
    } catch {
      /* lo stato vuoto parla da sé */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carica(); }, [carica]);

  const visibili = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((c) => !q || `${c.name} ${c.region ?? ''} ${c.country ?? ''}`.toLowerCase().includes(q));
  }, [list, query]);

  const markers = useMemo(
    () => visibili.filter((c) => c.lat != null && c.lng != null)
      .map((c) => ({ slug: c.slug, name: c.name, lat: c.lat as number, lng: c.lng as number })),
    [visibili],
  );

  function apri(slug: string) {
    setAperta(aperta === slug ? null : slug);
    const c = list.find((x) => x.slug === slug);
    if (c?.lat != null && c.lng != null) setVola({ lat: c.lat, lng: c.lng, zoom: 11, key: Date.now() });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Head title={t('cantineTitolo')} subtitle={t('cantineSottotitolo')} />

      <div className="overflow-hidden rounded-2xl border border-rule-paper">
        <WineMap
          markers={markers}
          selectedSlug={aperta}
          onMarkerClick={apri}
          flyTo={vola}
          heightClassName="h-[300px] lg:h-[440px]"
        />
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-full border border-rule-paper px-4">
        <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('cercaCantina')}
          className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Pulisci" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft">
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {visibili.map((c) => {
          const on = aperta === c.slug;
          const contatti = [c.phone, c.email, c.website, c.booking_url].filter(Boolean).length;
          return (
            <div key={c.slug} className="rounded-2xl border border-rule-paper">
              <button
                onClick={() => apri(c.slug)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                aria-expanded={on}
              >
                <MapPin size={17} strokeWidth={1.8} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">{c.name}</span>
                  <span className="mt-0.5 block truncate text-fine text-on-paper-muted">
                    {[c.region, c.country].filter(Boolean).join(', ')}
                    {c.visit_date ? ` · ${t('ciSiamoStati')}` : ''}
                  </span>
                </span>
                {contatti > 0 && !on && (
                  <span className="shrink-0 text-fine text-on-paper-muted">{t('contatti')}</span>
                )}
              </button>

              {on && (
                <div className="border-t border-rule-paper px-3.5 py-3">
                  {c.address && <p className="mb-2 text-fine text-on-paper-muted">{c.address}</p>}

                  <div className="flex flex-col gap-1.5">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex min-h-[44px] items-center gap-2.5 text-body">
                        <Phone size={16} strokeWidth={1.8} className="text-accent" />
                        {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex min-h-[44px] items-center gap-2.5 text-body">
                        <Mail size={16} strokeWidth={1.8} className="text-accent" />
                        {c.email}
                      </a>
                    )}
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-2.5 text-body">
                        <Globe size={16} strokeWidth={1.8} className="text-accent" />
                        {t('sitoCantina')}
                      </a>
                    )}
                    {c.booking_url && (
                      <a href={c.booking_url} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-2.5 text-body">
                        <ExternalLink size={16} strokeWidth={1.8} className="text-accent" />
                        {t('prenotaVisita')}
                      </a>
                    )}
                    {contatti === 0 && (
                      <p className="text-fine text-on-paper-muted">
                        {t('passiamoNoi')}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/wineries/${c.slug}`}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-rule-paper px-4 text-fine font-medium"
                    >
                      {t('laScheda')}
                    </Link>
                    {c.lat != null && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center rounded-full border border-rule-paper px-4 text-fine font-medium"
                      >
                        {t('comeArrivare')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visibili.length === 0 && (
        <Panel className="mt-4">
          <p className="text-body">{t('nessunaCantina')}</p>
        </Panel>
      )}
    </>
  );
}
