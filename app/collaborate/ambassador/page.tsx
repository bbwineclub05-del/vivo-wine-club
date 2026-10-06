import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import AmbassadorForm from '@/components/AmbassadorForm';

export async function generateMetadata() {
  const t = await getTranslations('ambassador');
  return {
    title: `${t('metaTitle')} — Vivo Wine Club`,
    description: t('metaDescription'),
  };
}

// Formats already presented on /events — anchors match EventsHub section ids.
const FORMATS = [
  { name: 'Wine Party',    href: '/events#party',  descKey: 'formatPartyDesc',  bg: 'bg-[#0a0204]' },
  { name: 'Wine Lounge',   href: '/events#lounge', descKey: 'formatLoungeDesc', bg: 'bg-[#2a0a0a]' },
  { name: 'Winery Visits', href: '/events#visits', descKey: 'formatVisitsDesc', bg: 'bg-[#421414]' },
] as const;

const LOOKING_FOR_KEYS = ['lookingItem1', 'lookingItem2', 'lookingItem3', 'lookingItem4'] as const;

const SELECTION_STEPS = [
  { title: 'selectionStep1Title', body: 'selectionStep1Body' },
  { title: 'selectionStep2Title', body: 'selectionStep2Body' },
  { title: 'selectionStep3Title', body: 'selectionStep3Body' },
] as const;

const font = { fontFamily: 'var(--font-nunito)' };
const syne = { fontFamily: 'var(--font-syne)' };

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className={`text-[10px] tracking-[0.5em] mb-4 ${light ? 'text-[#9b2323]' : 'text-[#731515]'}`}>{children}</div>
  );
}

export default async function AmbassadorPage() {
  const t = await getTranslations('ambassador');
  const tCommon = await getTranslations('common');

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── Hero ── */}
        <section className="bg-[#1a0505] text-[#F5EEE6]">
          <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
            <Link href="/collaborate" className="group inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#C4B5A0] hover:text-[#F5EEE6] transition-colors duration-300">
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              {tCommon('back')}
            </Link>
          </div>
          <div className="max-w-4xl mx-auto px-6 lg:px-10 py-20 md:py-28">
            <Eyebrow light>{t('eyebrow')}</Eyebrow>
            <h1 className="text-[clamp(2.4rem,6vw,5rem)] font-light leading-[1.05] mb-6" style={syne}>
              {t('heroTitle')}
            </h1>
            <p className="text-lg md:text-xl text-[#C4B5A0] font-light leading-relaxed max-w-2xl mb-10" style={font}>
              {t('heroSubtitle')}
            </p>
            <a
              href="#apply"
              className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] bg-[#731515] text-[#F5EEE6] text-[11px] tracking-[0.35em] hover:bg-[#9b2323] transition-colors rounded-lg"
            >
              {t('heroCta')}
            </a>
          </div>
        </section>

        {/* ── The role ── */}
        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-6 lg:px-10">
            <Eyebrow>{t('roleEyebrow')}</Eyebrow>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-tight mb-6" style={syne}>
              {t('roleTitle')}
            </h2>
            <p className="text-base md:text-lg text-[#4a2a2a] font-light leading-relaxed mb-4" style={font}>{t('roleBody')}</p>
            <p className="text-base md:text-lg text-[#4a2a2a] font-light leading-relaxed" style={font}>{t('roleDetails')}</p>
          </div>
        </section>

        {/* ── What you can organise ── */}
        <section className="pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <Eyebrow>{t('organizeEyebrow')}</Eyebrow>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-tight mb-4" style={syne}>
              {t('organizeTitle')}
            </h2>
            <p className="text-base md:text-lg text-[#4a2a2a] font-light leading-relaxed max-w-2xl mb-10" style={font}>
              {t('organizeBody')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FORMATS.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className={`group ${f.bg} text-[#F5EEE6] rounded-lg p-7 flex flex-col justify-between min-h-[220px] hover:-translate-y-0.5 transition-transform duration-300`}
                >
                  <div>
                    <div className="text-[10px] tracking-[0.5em] text-[#9b2323] mb-3">VIVO WINE CLUB</div>
                    <h3 className="text-2xl font-light mb-3" style={syne}>{f.name}</h3>
                    <p className="text-sm text-[#C4B5A0] font-light leading-relaxed" style={font}>{t(f.descKey)}</p>
                  </div>
                  <span className="mt-6 text-[10px] tracking-[0.35em] text-[#C4B5A0] group-hover:text-[#F5EEE6] transition-colors">
                    {t('discoverFormat')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── What you get ── */}
        <section className="bg-[#2a0a0a] text-[#F5EEE6] py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-6 lg:px-10">
            <Eyebrow light>{t('benefitsEyebrow')}</Eyebrow>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-light leading-tight mb-6" style={syne}>
              {t('benefitsTitle')}
            </h2>
            <p className="text-base md:text-lg text-[#C4B5A0] font-light leading-relaxed" style={font}>{t('benefitsBody')}</p>
          </div>
        </section>

        {/* ── What we look for ── */}
        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-6 lg:px-10">
            <Eyebrow>{t('lookingEyebrow')}</Eyebrow>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-tight mb-8" style={syne}>
              {t('lookingTitle')}
            </h2>
            <ul className="flex flex-col gap-4">
              {LOOKING_FOR_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-4 text-base md:text-lg text-[#4a2a2a] font-light leading-relaxed" style={font}>
                  <span aria-hidden="true" className="mt-3 w-6 h-px bg-[#731515] shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Selection process ── */}
        <section className="pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <Eyebrow>{t('selectionEyebrow')}</Eyebrow>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-tight mb-10" style={syne}>
              {t('selectionTitle')}
            </h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SELECTION_STEPS.map((step, i) => (
                <li key={step.title} className="bg-white/60 border border-[#e8d5d5] rounded-lg p-7">
                  <div className="text-3xl font-light text-[#731515] mb-4" style={syne}>{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="text-[11px] tracking-[0.35em] text-[#1a0505] mb-3">{t(step.title)}</h3>
                  <p className="text-sm text-[#4a2a2a] font-light leading-relaxed" style={font}>{t(step.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Form ── */}
        <section id="apply" className="relative pb-20 md:pb-28 scroll-mt-20">
          <div className="max-w-3xl mx-auto px-6 lg:px-10">
            <Eyebrow>{t('formEyebrow')}</Eyebrow>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-tight mb-4" style={syne}>
              {t('formTitle')}
            </h2>
            <p className="text-base text-[#7a4a4a] font-light leading-relaxed max-w-xl mb-10" style={font}>
              {t('formSubtitle')}
            </p>
            <AmbassadorForm />
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
