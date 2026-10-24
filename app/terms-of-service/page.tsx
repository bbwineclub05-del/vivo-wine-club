import { getLocale } from 'next-intl/server';
import { LegalDoc } from '@/components/ui/LegalDoc';
import { TERMS_OF_SERVICE } from '@/lib/legal/terms-of-service';
import { resolveLegalDocument } from '@/lib/legal/types';
import type { Locale } from '@/i18n/request';

export default async function TermsOfServicePage() {
  const locale = await getLocale();
  return <LegalDoc document={resolveLegalDocument(TERMS_OF_SERVICE, locale as Locale)} />;
}
