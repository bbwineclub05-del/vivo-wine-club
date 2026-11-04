import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft, MapPin } from 'lucide-react';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { Section } from '@/components/ui/Section';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import WineryPhotos from '@/components/WineryPhotos';
import WineryLocation from '@/components/WineryLocation';

/**
 * La scheda di una cantina.
 *
 * Prima questa pagina leggeva prima di tutto un elenco scritto dentro
 * il codice, e solo se non trovava niente guardava il database. Le
 * trentaquattro cantine presenti in entrambi mostravano quindi la
 * versione del codice: foto caricate, posizione corretta a mano,
 * descrizione riscritta dall'area riservata — niente di tutto questo
 * arrivava mai al sito. Adesso la fonte è una sola, il database, che è
 * anche l'unica che si può modificare senza un rilascio.
 */

/**
 * Pagina dinamica, non in cache.
 *
 * La lingua arriva da un cookie: una pagina messa in cache verrebbe
 * servita a tutti nella lingua di chi l'ha chiesta per primo. E le
 * schede si modificano dall'area riservata, quindi la correzione deve
 * vedersi subito, non dopo cinque minuti.
 */
export const dynamic = 'force-dynamic';

interface Winery {
  slug: string;
  name: string;
  logo_url: string | null;
  region: string | null;
  country: string | null;
  classification: string | null;
  short_description: string | null;
  description: string | null;
  visit_date: string | null;
  event_slug: string | null;
  lat: number | null;
  lng: number | null;
  hidden?: boolean;
}

interface Wine {
  id: string;
  name: string;
  vintage: string | null;
  grape: string | null;
  rating: number | null;
  note: string | null;
}

/** La data nella lingua di chi legge, non in quella di chi scrive. */
function fmtDate(iso: string, locale: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export default async function WineryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations('winery');
  const locale = await getLocale();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const [{ data: winery }, { data: wineRows }] = await Promise.all([
    db.from('wineries').select('*').eq('slug', slug).maybeSingle(),
    db.from('winery_wines').select('*').eq('winery_slug', slug).order('sort_order'),
  ]);

  if (!winery) notFound();

  const w = winery as Winery;

  // Una cantina nascosta è un doppione: si va alla scheda visibile con
  // lo stesso nome, e se non c'è la pagina non esiste.
  if (w.hidden) {
    const { data: twin } = await db
      .from('wineries')
      .select('slug')
      .eq('name', w.name)
      .eq('hidden', false)
      .limit(1)
      .maybeSingle();
    if (twin?.slug) redirect(`/wineries/${twin.slug}`);
    notFound();
  }

  const wines = (wineRows ?? []) as Wine[];
  const paragraphs = (w.description ?? '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const place = [w.region, w.country].filter(Boolean).join(', ');

  return (
    <>
      <SiteNav />
      <main className="ds bg-paper text-on-paper">
        {/* ── Chi è ── */}
        {/* Non `bleed`: quello toglie il margine laterale, e va bene
            per i titoli a tutta pagina. Qui dentro c'e' del testo, e
            senza margine il nome della cantina toccava il bordo
            dello schermo. */}
        <Section width="wide" className="pt-band">
          <Link
            href="/wineries"
            className="ds-link group mb-8 inline-flex min-h-[48px] items-center gap-2 text-body no-underline hover:text-accent"
          >
            <ArrowLeft size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            {t('backToWineries')}
          </Link>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="ds-display text-[clamp(2.1rem,7vw,4rem)] leading-[0.95] tracking-[-0.03em]">
                {w.name}
              </h1>

              {place && (
                <p className="mt-4 flex items-center gap-2 text-lead text-on-paper-muted">
                  <MapPin size={17} strokeWidth={1.8} className="shrink-0 text-accent" />
                  {place}
                </p>
              )}

              {w.classification && (
                <p className="mt-2 text-body text-on-paper-muted">{w.classification}</p>
              )}

              {w.visit_date && (
                <p className="mt-5 inline-flex items-center rounded-full border border-accent/35 bg-accent/8 px-4 py-1.5 text-fine text-accent">
                  {t('visitedOn', { date: fmtDate(w.visit_date, locale) })}
                </p>
              )}
            </div>

            {w.logo_url && (
              <div className="flex w-full max-w-[260px] shrink-0 items-center justify-center rounded-2xl border border-rule-paper bg-paper-soft p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.logo_url} alt={w.name} className="max-h-24 w-auto object-contain" />
              </div>
            )}
          </div>
        </Section>

        {/* ── Dov'è, davvero ── */}
        {w.lat != null && w.lng != null && (
          <Section tight>
            <WineryLocation name={w.name} lat={w.lat} lng={w.lng} />
          </Section>
        )}

        {/* ── Le foto della visita ── */}
        <Section tight>
          <WineryPhotos slug={w.slug} />
        </Section>

        {/* ── I vini assaggiati ── */}
        {wines.length > 0 && (
          <Section tight>
            <h2 className="ds-display mb-6 text-[26px] leading-none tracking-[-0.02em]">
              {t('whatWeTasted')}
            </h2>
            <div className="divide-y divide-rule-paper">
              {wines.map((wine) => (
                <div key={wine.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
                  <span className="text-body font-medium">{wine.name}</span>
                  {wine.vintage && <span className="ds-numeric text-body text-on-paper-muted">{wine.vintage}</span>}
                  {wine.grape && <span className="text-fine text-on-paper-muted">{wine.grape}</span>}
                  {wine.note && <p className="w-full text-fine text-on-paper-muted">{wine.note}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── La storia ── */}
        {paragraphs.length > 0 && (
          <Section tight className="pb-band">
            <h2 className="ds-display mb-6 text-[26px] leading-none tracking-[-0.02em]">{t('theEstate')}</h2>
            <div className="flex max-w-[68ch] flex-col gap-5">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-lead text-on-paper-muted">{p}</p>
              ))}
            </div>
          </Section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
