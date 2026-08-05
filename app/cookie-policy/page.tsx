import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import LegalDocumentView from '@/components/LegalDocumentView';
import { getLocale } from 'next-intl/server';
import { COOKIE_POLICY } from '@/lib/legal/cookie-policy';
import { resolveLegalDocument } from '@/lib/legal/types';
import type { Locale } from '@/i18n/request';

export default async function CookiePolicyPage() {
  const locale = await getLocale();
  const document = resolveLegalDocument(COOKIE_POLICY, locale as Locale);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-10">
          <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300" />
        </div>
        <LegalDocumentView document={document} />
      </main>
      <Footer />
    </>
  );
}
