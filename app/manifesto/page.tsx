import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { ButtonLink } from '@/components/ui/Button';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';

export async function generateMetadata() {
  const t = await getTranslations('site.manifesto');
  return { title: 'Manifesto | Vivo Wine Club', description: t('statement') };
}

const FOUNDERS = [
  { name: 'Giacomo Gallo', city: 'Turin', image: '/giacomo2.png', bioKey: 'bioGiacomo', linkedin: 'https://www.linkedin.com/in/giacomo-gallo-520a85286/' },
  { name: 'Filippo Lombardi', city: 'Brescia', image: '/filippo.png', bioKey: 'bioFilippo', linkedin: 'https://www.linkedin.com/in/filippolombardiofficial/' },
  { name: 'Cristiano Michelotti', city: 'Florence', image: '/cristiano.png', bioKey: 'bioCristiano', linkedin: 'https://www.linkedin.com/in/cristiano-michelotti-799a49299/' },
] as const;

const TEAM = [
  { name: 'Carolina Maria Carra', role: 'Media', linkedin: 'https://www.linkedin.com/in/carolina-maria-carra/' },
  { name: 'Elena Catellani', role: 'Media', linkedin: 'https://www.linkedin.com/in/elena-catellani-a70aa72b0/' },
  { name: 'Marcello Abbadati', role: 'Events · Sommelier', linkedin: 'https://www.linkedin.com/in/marcelloabbadati/' },
  { name: 'Giovanni Giachino', role: 'Events · Sommelier', linkedin: 'https://www.linkedin.com/in/giovanni-giachino-/' },
  { name: 'Francesco Basile', role: 'Sponsorship', linkedin: 'https://www.linkedin.com/in/francesco-basile-a3b670265/' },
  { name: 'Federico Paroli', role: 'Events', linkedin: 'https://www.linkedin.com/in/federico-paroli-a10793378/' },
  { name: 'Giulia Fascella', role: 'Media', linkedin: 'https://www.linkedin.com/in/giulia-fascella-4a0772366/' },
  { name: 'Daniele Natalini', role: 'Media', linkedin: 'https://www.linkedin.com/in/daniele-natalini-076190381/' },
  { name: 'Lorenzo Fioretti', role: 'Sponsorship', linkedin: 'https://www.linkedin.com/in/lorenzo-fioretti-a6726a258/' },
  { name: 'Edoardo Piceni', role: 'Tech', linkedin: 'https://www.linkedin.com/in/edoardo-antonio-piceni-89a132212/' },
] as const;

// Carried over from the previous page; the copy already exists in all
// three languages under the `whoWeAre` namespace.
const TIMELINE = [
  { place: 'timeline1Place', text: 'timeline1Text', detail: 'timeline1Detail', next: false },
  { place: 'timeline2Place', text: 'timeline2Text', detail: 'timeline2Detail', next: false },
  { place: 'timeline3Place', text: 'timeline3Text', detail: 'timeline3Detail', next: false },
  { place: 'timeline4Place', text: null, detail: 'timeline4Detail', next: true },
] as const;

export default async function ManifestoPage() {
  const t = await getTranslations('site.manifesto');
  const tw = await getTranslations('whoWeAre');
  const { SLOGAN } = await import('@/lib/brand');

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <Section bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Manifesto']} accent={[0, 0]} />
        </Section>

        <Section className="pt-0">
          <Statement align="left" className="max-w-[20ch]">
            {t('statement')}
          </Statement>
          <div className="mt-10 max-w-[62ch] space-y-5 text-lead text-on-paper-muted">
            <p>{t('body1')}</p>
            <p>{t('body2')}</p>
          </div>
        </Section>

        {/* ── The road so far ─────────────────────────────────
            A vertical column rather than the old horizontal rail:
            on a page that is already a long read, the eye should
            not have to change direction to follow it. */}
        <Section ground="paper-soft">
          <h2 className="ds-display text-title">{t('timelineTitle')}</h2>

          <ol className="mt-12 max-w-[64ch]">
            {TIMELINE.map((item, i) => (
              <li
                key={item.place}
                className={`relative grid gap-x-8 gap-y-2 pb-12 pl-8 last:pb-0 md:grid-cols-[11rem_1fr] md:pl-0 ${
                  i < TIMELINE.length - 1 ? 'border-l border-rule-paper md:border-l-0' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full md:hidden ${
                    item.next ? 'bg-rose ring-4 ring-rose/20' : 'bg-accent'
                  }`}
                />
                <p className={`text-fine font-medium ${item.next ? 'text-accent-soft' : 'text-on-paper-muted'}`}>
                  {tw(item.place)}
                </p>
                <div>
                  <h3 className={`text-subtitle ${item.next ? 'font-medium text-accent-soft' : 'font-medium'}`}>
                    {item.text ? tw(item.text) : SLOGAN}
                  </h3>
                  <p className="mt-2 text-body text-on-paper-muted">{tw(item.detail)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── Founders ────────────────────────────────────────── */}
        <Section>
          <h2 className="ds-display text-title">{t('foundersTitle')}</h2>
          <ul className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-3">
            {FOUNDERS.map((f) => (
              <li key={f.name}>
                <div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl border border-rule-paper bg-white">
                  <Image
                    src={f.image}
                    alt={f.name}
                    fill
                    sizes="(max-width: 768px) 60vw, 220px"
                    className="object-contain"
                  />
                </div>
                <h3 className="mt-5 text-subtitle font-medium">{f.name}</h3>
                <p className="mt-1 text-fine text-accent-soft">{f.city.toUpperCase()}</p>
                <p className="mt-3 max-w-[38ch] text-body text-on-paper-muted">{tw(f.bioKey)}</p>
                <a
                  href={f.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-link mt-3 inline-flex min-h-[44px] items-center text-fine no-underline hover:text-accent"
                >
                  LinkedIn
                </a>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Team ────────────────────────────────────────────
            Names and roles, nothing else: ten identical portrait
            cards would be filler, and the list reads faster. */}
        <Section ground="ink">
          <h2 className="ds-display text-title">{t('teamTitle')}</h2>
          <ul className="mt-10 divide-y divide-rule-ink border-t border-rule-ink">
            {TEAM.map((m) => (
              <li key={m.name}>
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[64px] items-center justify-between gap-6 py-4"
                >
                  <span className="text-subtitle">{m.name}</span>
                  <span className="shrink-0 text-fine text-on-ink-muted transition-colors group-hover:text-rose">
                    {m.role}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Closing ─────────────────────────────────────────── */}
        <Section>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="ds-display text-title">{t('ctaTitle')}</h2>
              <p className="mt-4 max-w-[42ch] text-lead text-on-paper-muted">{t('ctaBody')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/membership" size="lg">
                {t('ctaPrimary')}
              </ButtonLink>
              <ButtonLink href="/events" variant="outline" size="lg">
                {t('ctaSecondary')}
              </ButtonLink>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
