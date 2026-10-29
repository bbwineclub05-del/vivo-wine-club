import { getTranslations } from 'next-intl/server';

import { SLOGAN_LINES } from '@/lib/brand';
import { homeReels } from '@/lib/home-reels';
import { CREATOR_VISIBILE } from '@/lib/flags';
import { ButtonLink } from '@/components/ui/Button';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { DoorCard } from '@/components/ui/DoorCard';
import { Marquee } from '@/components/ui/Marquee';
import { Section } from '@/components/ui/Section';
import { VideoCard } from '@/components/ui/VideoCard';
import { MembershipValue } from '@/components/ui/MembershipValue';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SponsorRows } from '@/components/ui/SponsorRows';
import { SiteNav } from '@/components/ui/SiteNav';

export default async function Home() {
  const t = await getTranslations('site');
  // Vedi `public/home/LEGGIMI.md`: i file li carica chi fa i video.
  const reels = homeReels();

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

        {/* Una riga fra il film e la fila: senza, il taglio fra i due
            e' secco. Non ci rimettiamo lo slogan, che e' il titolo
            grande qui sopra e a quattro centimetri di distanza
            suonerebbe come una ripetizione. */}
        <Section width="wide" tight className="pb-6 pt-10">
          <p className="ds-display max-w-[22ch] text-title">{t('reels.line')}</p>
        </Section>

        <Section bleed width="full" tight className="pt-0">
          {/* Le schede hanno tutte la stessa altezza e la larghezza
              gliela da' la forma del video: le verticali strette, le
              orizzontali larghe. Cosi' la riga resta dritta anche
              mescolandole. */}
          <Marquee speed={44}>
            {reels.map((r, i) => (
              <VideoCard
                key={`${r.src}-${i}`}
                source={{ src: r.src, poster: r.poster, link: r.link }}
                continuo
                aspect={r.orientamento === 'orizzontale' ? 'wide' : 'reel'}
                sizes={r.orientamento === 'orizzontale' ? '(max-width: 768px) 440px, 560px' : '(max-width: 768px) 140px, 176px'}
                className="h-[248px] w-auto shrink-0 md:h-[312px]"
              />
            ))}
          </Marquee>
        </Section>

        {/* ── Thesis ────────────────────────────────────────────────
            The sentence the whole business rests on, before any offer. */}
        <Section ground="paper-soft">
          <Statement className="max-w-[18ch]">{t('statement.line')}</Statement>
        </Section>

        {/* ── Le porte ───────────────────────────────────────────
            Tre quando i creator si possono mostrare, due finche' non
            ci sono contratti firmati: vedi `lib/flags.ts`. */}
        <Section>
          <div className={`grid gap-5 ${CREATOR_VISIBILE ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <DoorCard
              index={0}
              href="/events"
              title={t('doors.eventsTitle')}
              body={t('doors.eventsBody')}
              cta={t('doors.eventsCta')}
            />
            {CREATOR_VISIBILE && (
              <DoorCard
                index={1}
                ground="ink"
                href="/talents"
                title={t('doors.creatorsTitle')}
                body={t('doors.creatorsBody')}
                cta={t('doors.creatorsCta')}
              />
            )}
            <DoorCard
              index={CREATOR_VISIBILE ? 2 : 1}
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
          </div>
        </Section>

        {/* Cosa si prende davvero iscrivendosi. Prima la home diceva
            che il club e' bello e mandava al modulo: chi non c'era
            mai stato non aveva modo di sapere cosa comprava. */}
        <Section ground="ink" tight className="pt-0">
          <p className="text-fine uppercase tracking-[0.22em] text-rose">{t('club.memberLine')}</p>
          <h3 className="ds-display mt-4 text-title">{t('club.valueTitle')}</h3>

          <div className="mt-10">
            <MembershipValue ground="ink" titolo={false} />
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ButtonLink href="/membership" variant="paper" size="lg">
              {t('club.ctaJoin')}
            </ButtonLink>
            <ButtonLink href="/events" variant="outline" size="lg" className="text-on-ink">
              {t('club.ctaEvents')}
            </ButtonLink>
          </div>
        </Section>
        {/* Chi lavora con noi, l'ultima cosa prima del piede. */}
        <Section width="wide" ground="paper-soft">
          <h2 className="ds-display mb-10 text-title">{t('sponsors.title')}</h2>
          <SponsorRows />
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
