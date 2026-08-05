/**
 * Cookie consent state — technical cookies are always active (required for
 * the site to function, no consent needed under GDPR). Analytics (Google
 * Analytics) and marketing (Meta Pixel) only load once the user opts in.
 * Consent lives in localStorage and broadcasts via window events so the
 * banner, the footer "Manage Cookies" link, and the script loader can all
 * react without a page reload.
 */

const STORAGE_KEY = 'vivo_cookie_consent';
export const CONSENT_CHANGED_EVENT = 'vivo-consent-changed';
export const OPEN_PREFERENCES_EVENT = 'vivo-open-cookie-preferences';

export interface ConsentCategories {
  analytics: boolean;
  marketing: boolean;
}

export function getStoredConsent(): ConsentCategories | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics === 'boolean' && typeof parsed?.marketing === 'boolean') {
      return { analytics: parsed.analytics, marketing: parsed.marketing };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConsent(categories: ConsentCategories): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  window.dispatchEvent(new CustomEvent<ConsentCategories>(CONSENT_CHANGED_EVENT, { detail: categories }));
}

/** Dispatched by the footer "Manage Cookies" link to reopen the preferences panel. */
export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}
