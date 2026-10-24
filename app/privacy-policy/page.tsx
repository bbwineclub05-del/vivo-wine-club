import { getLocale } from 'next-intl/server';
import { LegalDoc } from '@/components/ui/LegalDoc';
import { PRIVACY_POLICY } from '@/lib/legal/privacy-policy';
import { resolveLegalDocument } from '@/lib/legal/types';
import type { Locale } from '@/i18n/request';

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  return <LegalDoc document={resolveLegalDocument(PRIVACY_POLICY, locale as Locale)} />;
}
