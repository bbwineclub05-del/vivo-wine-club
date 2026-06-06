import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import messagesEn from '../messages/en.json';
import messagesIt from '../messages/it.json';
import messagesFr from '../messages/fr.json';

export const LOCALES = ['en', 'it', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const defaultLocale: Locale = 'en';

const MESSAGES_MAP = { en: messagesEn, it: messagesIt, fr: messagesFr } as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value ?? '';
  const locale: Locale = (LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : defaultLocale;

  return {
    locale,
    messages: MESSAGES_MAP[locale],
  };
});
