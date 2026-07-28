import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import { getTranslations } from 'next-intl/server';

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('legal');

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-10 pb-24">
          <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-8" />
          <h1
            className="text-[clamp(2rem,5vw,3rem)] font-light text-[#1a0505] leading-tight mb-6"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {t('privacyPolicyTitle')}
          </h1>
          <p className="text-[#7a4a4a] text-sm leading-relaxed mb-6" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t('placeholderIntro')}
          </p>
          <div className="glass-card p-6 sm:p-8 text-[#7a4a4a] text-sm italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            {t('placeholderNotice')}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
