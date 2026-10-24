'use client';

import { openCookiePreferences } from '@/lib/cookieConsent';

/**
 * Riapre le preferenze sui cookie dal piede della pagina.
 *
 * Un'isola client dentro un piede che è un componente server: è
 * l'unico pezzo di quella riga che ha bisogno di un `onClick`, e
 * deve esserci — una scelta sui cookie si deve poter cambiare dopo
 * averla data.
 */
export function ManageCookiesLink({ label }: { label: string }) {
  return (
    <button type="button" onClick={openCookiePreferences} className="ds-link no-underline hover:text-rose">
      {label}
    </button>
  );
}
