// Ambassador application — editable configuration.
// Shared by the /collaborate/ambassador form and the /api/ambassador endpoint,
// so adding/removing an area here updates both the UI and server validation.

export type AmbassadorLocale = 'it' | 'en' | 'fr';

export const AMBASSADOR_LOCALES: readonly AmbassadorLocale[] = ['it', 'en', 'fr'];

/** Any value outside it/en/fr falls back to English. */
export function normalizeAmbassadorLocale(value: unknown): AmbassadorLocale {
  return (AMBASSADOR_LOCALES as readonly unknown[]).includes(value) ? (value as AmbassadorLocale) : 'en';
}

// Geographic areas an ambassador can apply for. `value` is what gets stored
// in the DB (and used in the staff email subject) — keep it short, lowercase
// and stable; `label` is what the candidate sees.
export const AMBASSADOR_AREAS = [
  { value: 'paris',    label: { it: 'Parigi',  en: 'Paris',    fr: 'Paris' } },
  { value: 'turin',    label: { it: 'Torino',  en: 'Turin',    fr: 'Turin' } },
  { value: 'florence', label: { it: 'Firenze', en: 'Florence', fr: 'Florence' } },
  { value: 'brescia',  label: { it: 'Brescia', en: 'Brescia',  fr: 'Brescia' } },
] as const satisfies readonly { value: string; label: Record<AmbassadorLocale, string> }[];

/** Always offered after the configured areas; requires a free-text area. */
export const AMBASSADOR_AREA_OTHER = 'other';

export const AMBASSADOR_EVENT_TYPES = ['party', 'lounge', 'visits', 'other'] as const;
export type AmbassadorEventType = (typeof AMBASSADOR_EVENT_TYPES)[number];

export function isAmbassadorArea(value: string): boolean {
  return value === AMBASSADOR_AREA_OTHER || AMBASSADOR_AREAS.some((a) => a.value === value);
}

export function ambassadorAreaLabel(value: string, locale: AmbassadorLocale): string {
  return AMBASSADOR_AREAS.find((a) => a.value === value)?.label[locale] ?? value;
}

// Max lengths (characters), enforced client-side via maxLength and server-side.
export const AMBASSADOR_LIMITS = {
  name:         80,
  email:        200,
  phone:        40,
  areaOther:    120,
  longText:     3000, // experience, motivation
  mediumText:   2000, // local contacts, community
  linkedin:     300,
  social:       500,
  availability: 500,
  languages:    200,
} as const;

export const AMBASSADOR_RATE_LIMIT = {
  perIpPerHour:   3,
  perEmailPerDay: 2,
} as const;
