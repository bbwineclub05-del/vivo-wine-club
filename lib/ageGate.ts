/**
 * La porta dei diciotto anni.
 *
 * Non è un controllo — nessuno può verificare un'età da un browser —
 * ma la dichiarazione che la legge chiede a chi parla di alcolici, e
 * va chiesta una volta sola.
 *
 * Il sì sta in localStorage: vale finché non si pulisce il browser.
 * Il no sta in sessionStorage: dura quanto la finestra aperta. Un
 * bambino che risponde la verità non deve restare chiuso fuori per
 * sempre dal computer di casa, e un adulto che sbaglia pulsante deve
 * poter chiudere la scheda e rientrare.
 */

const KEY = 'vivo_age_ok';
export const AGE_CHANGED_EVENT = 'vivo-age-changed';

export type AgeAnswer = 'yes' | 'no' | null;

export function getStoredAge(): AgeAnswer {
  if (typeof window === 'undefined') return null;
  try {
    if (window.localStorage.getItem(KEY) === 'yes') return 'yes';
    if (window.sessionStorage.getItem(KEY) === 'no') return 'no';
  } catch {
    /* navigazione privata o storage bloccato: si richiede, e pazienza */
  }
  return null;
}

export function saveAge(answer: Exclude<AgeAnswer, null>): void {
  if (typeof window === 'undefined') return;
  try {
    if (answer === 'yes') {
      window.localStorage.setItem(KEY, 'yes');
      window.sessionStorage.removeItem(KEY);
    } else {
      window.sessionStorage.setItem(KEY, 'no');
      window.localStorage.removeItem(KEY);
    }
  } catch {
    /* senza storage la risposta vale per questa pagina soltanto */
  }
  window.dispatchEvent(new Event(AGE_CHANGED_EVENT));
}
