import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import messagesEn from '../messages/en.json';
import messagesIt from '../messages/it.json';
import messagesFr from '../messages/fr.json';

export const LOCALES = ['en', 'it', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const defaultLocale: Locale = 'en';

const MESSAGES_MAP = { en: messagesEn, it: messagesIt, fr: messagesFr } as const;

/**
 * La lingua del browser, quando una scelta non c'e' ancora.
 *
 * `Accept-Language` arriva come un elenco in ordine di preferenza,
 * tipo `it-IT,it;q=0.9,en-US;q=0.8`: si legge il peso di ognuna, si
 * mettono in fila e si prende la prima delle tre che parliamo. La
 * regione non conta, `it-CH` e `it-IT` sono entrambe italiano.
 *
 * Se non si capisce niente, resta l'inglese: e' la lingua con cui ci
 * presentiamo a chi non sappiamo da dove arriva.
 */
function linguaDelBrowser(accept: string | null): Locale {
  if (!accept) return defaultLocale;

  const voci = accept
    .split(',')
    .map((pezzo) => {
      const [tag, ...parametri] = pezzo.trim().split(';');
      const q = parametri
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='));
      const peso = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        lingua: tag.trim().toLowerCase().split('-')[0],
        peso: Number.isFinite(peso) ? peso : 0,
      };
    })
    .filter((v) => v.peso > 0)
    .sort((a, b) => b.peso - a.peso);

  const trovata = voci.find((v) => (LOCALES as readonly string[]).includes(v.lingua));
  return (trovata?.lingua as Locale) ?? defaultLocale;
}

/**
 * La lingua di questa richiesta.
 *
 * Una scelta fatta a mano vale piu' di quello che dice il browser, e
 * vale anche quando coincide con l'inglese: chi ha cliccato English su
 * un computer italiano non deve ritrovarsi l'italiano al giro dopo.
 * Senza cookie si guarda il browser.
 *
 * Sta qui e si esporta perche' la leggono in due, questo file e il
 * layout: tenerne due copie significa che un giorno una delle due
 * cambia e l'altra no.
 */
export async function localeDellaRichiesta(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value ?? '';
  if ((LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  return linguaDelBrowser((await headers()).get('accept-language'));
}

export default getRequestConfig(async () => {
  const locale = await localeDellaRichiesta();
  return { locale, messages: MESSAGES_MAP[locale] };
});
