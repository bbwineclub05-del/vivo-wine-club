'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ExternalLink, Wine } from 'lucide-react';
import { Head, Panel } from '@/components/member/MemberShell';

/**
 * VIVO Selection.
 *
 * Bottiglie che abbiamo bevuto noi, da cantine in cui siamo stati,
 * scelte sul rapporto qualità prezzo. È un carosello perché sono
 * poche e vanno guardate una per volta: un elenco le farebbe
 * sembrare un catalogo, e un catalogo non lo legge nessuno.
 *
 * Su un telefono scorre col dito, con lo scatto su ogni scheda.
 */

interface Vino {
  id: string;
  name: string;
  producer: string | null;
  winery_slug: string | null;
  vintage: string | null;
  region: string | null;
  grape: string | null;
  price_cents: number | null;
  where_to_buy: string | null;
  photo_url: string | null;
  note_it: string | null;
  note_en: string | null;
  note_fr: string | null;
}

function eur(cents: number) {
  return `${Math.floor(cents / 100)}${cents % 100 ? ',' + String(cents % 100).padStart(2, '0') : ''} €`;
}

export default function SelectionSection({ token }: { token: string }) {
  const t = useTranslations('member');
  const locale = useLocale();
  const [vini, setVini] = useState<Vino[]>([]);
  const [loading, setLoading] = useState(true);
  const pista = useRef<HTMLDivElement>(null);

  const carica = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wine-selection', { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      setVini(j.wines ?? []);
    } catch {
      /* lo stato vuoto dice già cosa sta succedendo */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { carica(); }, [carica]);

  /** La nota nella lingua di chi legge; se manca, quella italiana. */
  function nota(v: Vino) {
    const scelta = locale === 'en' ? v.note_en : locale === 'fr' ? v.note_fr : v.note_it;
    return (scelta ?? v.note_it ?? '').trim();
  }

  function scorri(verso: -1 | 1) {
    const el = pista.current;
    if (!el) return;
    el.scrollBy({ left: verso * Math.min(el.clientWidth * 0.85, 340), behavior: 'smooth' });
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
      <Head title={t('selectionTitolo')} subtitle={t('selectionSottotitolo')} />

      {vini.length === 0 ? (
        <Panel>
          <p className="text-body">{t('selectionVuota')}</p>
          <p className="mt-2 text-fine text-on-paper-muted">{t('selectionVuotaAiuto')}</p>
        </Panel>
      ) : (
        <>
          {/* Le frecce servono al computer: sul telefono si scorre col dito. */}
          <div className="mb-3 hidden justify-end gap-2 lg:flex">
            {([-1, 1] as const).map((v) => (
              <button
                key={v}
                onClick={() => scorri(v)}
                aria-label={v === -1 ? 'Indietro' : 'Avanti'}
                className="grid h-10 w-10 place-items-center rounded-full border border-rule-paper transition-colors hover:border-accent/40"
              >
                {v === -1 ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            ))}
          </div>

          <div
            ref={pista}
            className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {vini.map((v) => (
              <article
                key={v.id}
                className="flex w-[min(78vw,320px)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-rule-paper"
              >
                {/* Un rettangolo di altezza fissa, e la foto dentro
                    tenuta fuori dal flusso.
                    Prima il riquadro era `aspect-[4/3]` e la foto
                    `h-full`: un'altezza in percentuale dentro un box
                    che la sua altezza la ricava dalla proporzione e'
                    un cerchio, il browser rinuncia e disegna la foto
                    alla sua misura naturale. Una bottiglia da duemila
                    pixel faceva crescere la scheda con se'.
                    `absolute` toglie la foto dal flusso, cosi' non
                    puo' piu' decidere quanto e' alta la scheda.
                    E `object-contain`: una bottiglia tagliata da un
                    riquadro orizzontale si vede a fette. */}
                <div className="relative h-48 shrink-0 overflow-hidden bg-paper-soft sm:h-56">
                  {v.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.photo_url}
                      alt={v.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-3"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center">
                      <Wine size={34} strokeWidth={1.4} className="text-accent/40" />
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="text-body font-medium leading-tight">{v.name}</p>
                  <p className="mt-1 text-fine text-on-paper-muted">
                    {[v.producer, v.vintage].filter(Boolean).join(' · ')}
                  </p>
                  {(v.region || v.grape) && (
                    <p className="mt-0.5 text-fine text-on-paper-muted">
                      {[v.region, v.grape].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {nota(v) && <p className="mt-3 text-fine text-on-paper">{nota(v)}</p>}

                  <div className="mt-auto pt-4">
                    {v.price_cents != null && (
                      <p className="ds-numeric text-body font-medium text-accent">
                        {t('intorno', { price: eur(v.price_cents) })}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {v.winery_slug && (
                        <Link
                          href={`/wineries/${v.winery_slug}`}
                          className="inline-flex min-h-[40px] items-center rounded-full border border-rule-paper px-3.5 text-fine font-medium"
                        >
                          {t('laCantina')}
                        </Link>
                      )}
                      {v.where_to_buy && (
                        <a
                          href={v.where_to_buy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-rule-paper px-3.5 text-fine font-medium"
                        >
                          {t('doveTrovarlo')}
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
