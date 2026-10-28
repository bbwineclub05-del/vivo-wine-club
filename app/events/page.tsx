import { getTranslations } from 'next-intl/server';

import { ButtonLink } from '@/components/ui/Button';
import { Chapter, Statement } from '@/components/ui/Chapter';
import { ClubCollage } from '@/components/ui/ClubCollage';
import { ClubEvents } from '@/components/ui/ClubEvents';
import { MembershipValue } from '@/components/ui/MembershipValue';
import { Section } from '@/components/ui/Section';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import { homeReels } from '@/lib/home-reels';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { dbEventToEventData, type DbEvent, type EventData } from '@/lib/events';

export const dynamic = 'force-dynamic';

const FORMATS = [
  { id: 'party', name: 'Wine Party', descKey: 'formatPartyDesc' },
  { id: 'lounge', name: 'Wine Lounge', descKey: 'formatLoungeDesc' },
  { id: 'visits', name: 'Winery Visits', descKey: 'formatVisitsDesc' },
] as const;

export default async function EventsPage() {
  const t = await getTranslations('site.club');
  const tf = await getTranslations('ambassador');

  // Unchanged query: published, from today, soonest first.
  let events: EventData[] = [];
  const today = new Date().toISOString().slice(0, 10);
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('published', true)
      .gte('date', today)
      .order('date', { ascending: true });

    if (!error && data) events = (data as DbEvent[]).map(dbEventToEventData);
  } catch {
    /* fall through with an empty calendar */
  }

  return (
    <>
      <SiteNav />

      <main className="ds bg-paper text-on-paper">
        <Section ground="ink" bleed width="full" tight className="pt-band">
          <Chapter as="h1" lines={['Vivo', 'Club']} accent={[1, 1]} />
        </Section>

        <Section ground="ink" className="pt-0">
          <div className="mx-auto max-w-[62ch] text-center">
            <Statement>{t('pageStatement')}</Statement>
            <p className="mt-10 text-lead text-on-ink-muted">{t('body1')}</p>
          </div>
        </Section>

        {/* ── Com'e' una serata, prima di leggere le date ── */}
        <Section tight>
          <ClubCollage reels={homeReels()} />
        </Section>

        {/* ── The calendar ────────────────────────────────────── */}
        <Section id="calendar">
          <h2 className="ds-display text-title">{t('upcoming')}</h2>
          <div className="mt-10">
            <ClubEvents events={events} />
          </div>
        </Section>

        {/* ── The three formats ───────────────────────────────── */}
        <Section ground="paper-soft">
          <h2 className="ds-display text-title">{t('formatsTitle')}</h2>
          <dl className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {FORMATS.map((f) => (
              <div key={f.id} id={f.id} className="scroll-mt-28 border-t border-rule-paper pt-5">
                <dt className="text-subtitle font-medium">{f.name}</dt>
                <dd className="mt-3 text-body text-on-paper-muted">{tf(f.descKey)}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* ── The estates ─────────────────────────────────────
            Reached from the two pages that link back to #estates. */}
        <Section id="estates" ground="ink">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="ds-display text-title">{t('estatesTitle')}</h2>
              <p className="mt-4 max-w-[48ch] text-lead text-on-ink-muted">{t('estatesBody')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/wineries" variant="paper" size="lg">
                {t('estatesCta')}
              </ButtonLink>
            </div>
          </div>
        </Section>

        {/* ── Cosa apre la tessera ────────────────────────────
            Il prezzo no: quello sta dove si paga, un clic sotto. */}
        <Section ground="paper-soft">
          <MembershipValue prezzo={false} />
        </Section>

        <Section>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="ds-display text-title">{t('ctaJoin')}</h2>
              <p className="mt-4 max-w-[44ch] text-lead text-on-paper-muted">{t('body2')}</p>
            </div>
            <ButtonLink href="/membership" size="lg">
              {t('ctaJoin')}
            </ButtonLink>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
