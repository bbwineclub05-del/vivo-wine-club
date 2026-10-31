import { getLocale } from 'next-intl/server';
import { LegalDoc } from '@/components/ui/LegalDoc';
import { COOKIE_POLICY } from '@/lib/legal/cookie-policy';
import { resolveLegalDocument } from '@/lib/legal/types';
import type { Locale } from '@/i18n/request';

export default async function CookiePolicyPage() {
  const locale = await getLocale();
  return <LegalDoc document={resolveLegalDocument(COOKIE_POLICY, locale as Locale)} />;
}
