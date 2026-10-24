import { getTranslations } from 'next-intl/server';

import { SLOGAN_LINES } from '@/lib/brand';
import { ButtonLink } from '@/components/ui/Button';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { DoorCard } from '@/components/ui/DoorCard';
import { Marquee } from '@/components/ui/Marquee';
import { Section } from '@/components/ui/Section';
import { VideoCard } from '@/components/ui/VideoCard';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';

// Placeholder reels. Swap `src` for the finished vertical clips; the row
// reads the same whatever lands here, as long as the clips are 9:16.
const REELS = [
  { src: '/videosito-corto.mp4', poster: '/vigna.jpg' },
  { src: '/videosito-corto.mp4', poster: '/vigna.jpg' },
  { src: '/videosito-corto.mp4', poster: '/vigna.jpg' },
  { src: '/videosito-corto.mp4', poster: '/vigna.jpg' },
  { src: '/videosito-corto.mp4', poster: '/vigna.jpg' },
  { src: '/videosito-corto.mp4', poster: '/vigna.jpg' },
];

export default async function Home() {
  const t = await getTranslations('site');

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        {/* ── Hero ──────────────────────────────────────────────────
            The headline, the promise and both doors sit above the fold;
            the film is the second beat, not the backdrop. */}
        <Section width="wide" className="pb-0">
          <Chapter
            as="h1"
            size="statement"
            align="left"
            lines={SLOGAN_LINES as unknown as [string, string]}
          />

          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[46ch] text-lead text-on-paper-muted">{t('hero.lead')}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/membership" size="lg">
                {t('hero.ctaPrimary')}
              </ButtonLink>
              <ButtonLink href="/brands" variant="outline" size="lg">
                {t('hero.ctaSecondary')}
              </ButtonLink>
            </div>
          </div>
        </Section>

        {/* Intro film, then the reels drifting past underneath it. */}
        <Section width="wide" tight className="pt-10">
          <VideoCard
            priority
            aspect="cinema"
            rounded="rounded-3xl"
            source={{ src: '/videosito-corto.mp4', poster: '/vigna.jpg' }}
          />
        </Section>

        <Section bleed width="full" tight className="pt-0">
          <Marquee speed={56}>
            {REELS.map((r, i) => (
              <VideoCard key={i} source={r} className="w-[172px] md:w-[216px]" />
            ))}
          </Marquee>
        </Section>

        {/* ── Thesis ────────────────────────────────────────────────
            The sentence the whole business rests on, before any offer. */}
        <Section ground="paper-soft">
          <Statement className="max-w-[18ch]">{t('statement.line')}</Statement>
        </Section>

        {/* ── Three doors ───────────────────────────────────────── */}
        <Section>
          <div className="grid gap-5 md:grid-cols-3">
            <DoorCard
              index={0}
              href="/events"
              title={t('doors.eventsTitle')}
              body={t('doors.eventsBody')}
              cta={t('doors.eventsCta')}
            />
            <DoorCard
              index={1}
              ground="ink"
              href="/talents"
              title={t('doors.creatorsTitle')}
              body={t('doors.creatorsBody')}
              cta={t('doors.creatorsCta')}
            />
            <DoorCard
              index={2}
              ground="accent"
              href="/brands"
              title={t('doors.brandsTitle')}
              body={t('doors.brandsBody')}
              cta={t('doors.brandsCta')}
            />
          </div>
        </Section>

        {/* ── Vivo Studio ───────────────────────────────────────── */}
        <Section bleed width="full" tight>
          <Chapter lines={['Vivo', 'Studio']} accent={[1, 3]} />
        </Section>

        <Section className="pt-0">
          <Statement align="left" className="max-w-[22ch]">
            {t('studio.statement')}
          </Statement>
          <div className="mt-10 max-w-[62ch] space-y-5 text-lead text-on-paper-muted">
            <p>{t('studio.body1')}</p>
            <p>{t('studio.body2')}</p>
          </div>
          {/* Dritto al modulo: chi arriva qui ha già letto cosa
              facciamo, e un'altra pagina di spiegazioni in mezzo è un
              passaggio in cui si perde gente. */}
          <ButtonLink href="/apply?kind=company" size="lg" className="mt-10">
            {t('studio.cta')}
          </ButtonLink>
        </Section>

        {/* ── Vivo Club ─────────────────────────────────────────── */}
        <Section ground="ink" bleed width="full" tight>
          <Chapter lines={['Vivo', 'Club']} accent={[1, 1]} />
        </Section>

        <Section ground="ink" className="pt-0">
          <div className="mx-auto max-w-[62ch] text-center">
            <Statement>{t('club.statement')}</Statement>
            <div className="mt-10 space-y-5 text-lead text-on-ink-muted">
              <p>{t('club.body1')}</p>
              <p>{t('club.body2')}</p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/events" variant="paper" size="lg">
                {t('club.ctaEvents')}
              </ButtonLink>
              <ButtonLink href="/membership" variant="outline" size="lg" className="text-on-ink">
                {t('club.ctaJoin')}
              </ButtonLink>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
